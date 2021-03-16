import './login.css';

import { Form, Input, Button, Space, message, Select, Row, Col, Alert, notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { LoadingOutlined, CheckOutlined, ExclamationCircleOutlined, FileProtectOutlined } from '@ant-design/icons'
import { useCallback, useContext, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { remote } from 'electron';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudversify } from '@fortawesome/free-brands-svg-icons';

import fs from 'fs';

import countryCodes from 'country-codes-list';

import { completePhoneNumberAuth, getFollowingIds, startPhoneNumberAuth, updateAuthHeaders, updateName, checkWaitlistStatus } from '../chapi';
import { userInfoContext } from '../context';

const { Option } = Select;

const countryCallingCodes = countryCodes.customList('countryCode', '+{countryCallingCode}');
const localCallingCode = countryCallingCodes[(navigator.language || 'US').slice(-2).toUpperCase()];

const layout = {
  labelCol: {
    span: 4,
  },
  wrapperCol: {
    span: 20,
  },
  style: {
    width: '80%',
    margin: '2em auto',
  },
};
const tailLayout = {
  wrapperCol: {
    offset: 8,
    span: 16,
  },
};

const icons = {
  'loading': LoadingOutlined,
  'checked': CheckOutlined,
  'error': ExclamationCircleOutlined,
};

const LoginPage = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [SubmitButtonIcon, setSubmitButtonIcon] = useState();
  const SubmitButtonIconComp = icons[SubmitButtonIcon];
  const [vcodeLoading, setVcodeLoading] = useState(false);
  const [vcodeError, setVcodeError] = useState(false);

  const [loginShow, setLoginShow] = useState(false);

  const [isCompleted, setCompleted] = useState(false);
  const [isWait, setWait] = useState(false);
  const [isOnboarding, setOnboarding] = useState(false);

  const [, setUserInfo] = useContext(userInfoContext);

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const takeAuthorizedInfo = useCallback(async () => {
    try {
      const { canceled, filePaths } = await remote.dialog.showOpenDialog();
      if (!canceled && filePaths.length > 0) {
        const content = await fs.promises.readFile(filePaths[0]);
        const authInfo = JSON.parse(content);
        if (authInfo.userId && authInfo.userDevice && authInfo.userToken) {
          localStorage.setItem('userInfo', content);
          updateAuthHeaders(authInfo)
          authInfo.followingIds = await getFollowingIds();
          setUserInfo(authInfo);
          history.push('/clubhouse');
        } else {
          message.warn(t('authInfoNotFound'));
        }
      }
    } catch (e) {
      message.error(t('authInfoReadFail') + ': ' + e.toString());
    }
  }, [history, setUserInfo, t]);

  const countryCodeSelector = (
    <Form.Item name="countryCode" noStyle>
      <Select style={{ width: 120 }}>
        {Object.entries(countryCallingCodes).sort((a, b) => a[0].localeCompare(b[0])).map(([code, calling], idx) => (
          <Option key={idx} value={calling}>{code} {calling}</Option>
        ))}
      </Select>
    </Form.Item>
  );

  return (
    <Space direction="vertical" style={{ height: '100%', width: '100%', paddingTop: '2em' }}>
      <Row>
        <Col span={18} style={{textAlign: 'right'}}>
          <Button type="link" icon={<FileProtectOutlined />} onClick={takeAuthorizedInfo}>
            {t('importAuthorized')}
          </Button>
        </Col>
      </Row>

      <Form form={form}
        {...layout}
        name="basic"
        initialValues={{
          countryCode: localCallingCode,
        }}
        onFinish={completeAuth}
        onFinishFailed={onFinishFailed}
      >
        <Form.Item
          name="mobile"
          rules={[
            {
              required: true,
              message: t('mobileDesc'),
            },
          ]}
        >
          <Input
            addonBefore={countryCodeSelector}
            addonAfter={
              <Button
                icon={<FontAwesomeIcon icon={faCloudversify}/>}
                loading={vcodeLoading}
                danger={vcodeError}
                type="link"
                size="small"
                onClick={sendVerificationCode}
                disabled={isCompleted}
                title={t('sendvcode')}
              />
            }
            disabled={isCompleted}
            placeholder={t('mobile')} />
        </Form.Item>

        <Form.Item
          name="vcode"
          style={{visibility: loginShow ? 'visible' : 'hidden'}}
          rules={[{ required: true }]}
        >
          <Input
            className="ch-login-input-group"
            disabled={isCompleted}
            placeholder={t('vcode')}
            addonAfter={
              <Button icon={SubmitButtonIconComp && <SubmitButtonIconComp />}  type="link" size="small" block htmlType="submit" disabled={isCompleted}>
                {t('login')}
              </Button>
            }
          />
        </Form.Item>
      </Form>

      {isWait && (
        <Alert
          message={t('waitListed')}
          description={t('waitListedDesc')}
          type="warning"
        />
      )}

      {isOnboarding && (
        <Form
          {...layout}
          name="basic"
          initialValues={{ remember: true }}
          onFinish={onBoardingSubmit}
        >
          <Form.Item
            label="Legal name"
            name="realname"
            rules={[{ required: true, message: 'YOU CAN ONLY DO THIS ONCE' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item {...tailLayout}>
            <Button type="primary" htmlType="submit">
              Submit
              </Button>
          </Form.Item>
        </Form>
      )}
    </Space>
  );

  async function sendVerificationCode() {
    const mobile = (form.getFieldValue('countryCode') + form.getFieldValue('mobile')).replace(/\s/g, '');
    setVcodeLoading(true);
    try {
      const resp = await startPhoneNumberAuth(mobile);
      console.log('=== startAuth ===', resp);
      console.log(resp);
      if (resp.body.success) {
        setVcodeError(false);
        setLoginShow(true);
      } else {
        setVcodeError(true);
      }
    } catch (e) {
      console.error(e);
      setVcodeError(true);
    } finally {
      setVcodeLoading(false);
    }
  }

  async function completeAuth({ countryCode, mobile, vcode }) {
    setSubmitButtonIcon('loading');
    try {
      const resp = await completePhoneNumberAuth((countryCode + mobile).replace(/\s/g, ''), vcode);
      console.log('=== completeAuth ===', resp);

      if (resp.status === 200) {
        const uinfo = {
          userId: resp.body.user_profile.user_id,
          userToken: resp.body.auth_token,
          userDevice: resp.headers['CH-DeviceId'],
        };
        localStorage.setItem('userInfo', JSON.stringify(uinfo));
        updateAuthHeaders(uinfo);

        setSubmitButtonIcon('checked');
        setCompleted(true);
        uinfo.followingIds = await getFollowingIds();
        setUserInfo(uinfo);

        if (resp.body.is_waitlisted) {
          setWait(true);
        } else if (resp.body.is_onboarding) {
          setOnboarding(true);
        } else {
          goClubhouse();
        }
      } else {
        setSubmitButtonIcon('error');
      }
    } catch (e) {
      setSubmitButtonIcon('error');
    }
  }

  async function goClubhouse() {
    setTimeout(() => {
      history.push('/clubhouse');
    }, 1000);
  }


  async function onBoardingSubmit({username, realname}) {
    try {
      const respName = await updateName(realname);
      if (respName.status !== 200 || respName.body.success) {
        notification.open({
          message: t('apiError'),
          description: respName.body.error_message
        });
        return;
      }

      const respUsername = await updateName(username);
      if (respUsername.status !== 200 || respUsername.body.success) {
        notification.open({
          message: t('apiError'),
          description: respUsername.body.error_message
        });
        return;
      }

      setOnboarding(false);

      const respChk = await checkWaitlistStatus();
      if (respChk.status === 200 && respChk.body.success) {
        goClubhouse();
      }
    } catch(e) {
      notification.open({
        message: t('requestError'),
        description: e.message
      })
    }
  }
};

export default LoginPage;
