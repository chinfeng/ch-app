import { ArrowRightOutlined, LockOutlined, RocketOutlined, TeamOutlined } from "@ant-design/icons";
import { Radio, Space, Input, notification } from "antd";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router";
import { createChannel } from "../chapi";
const { Search } = Input;

const CreateChannel = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const [type, setType] = useState('open');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const doCreateChannel = useCallback(async () => {
    setLoading(true);
    const create = {
      open: () => createChannel(topic, [], false, false),
      social: () => createChannel(topic, [], true, false),
      private: () => createChannel(topic, [], false, true)
    }[type];
    try {
      const resp = await create();
      console.log('=== createChannel ===', {topic, type}, resp);
      if (resp.body.success) {
        setType('open');
        setTopic('');
        history.push(resp.body.channel);
      } else {
        notification.open({
          title: t('apiError'),
          description: resp.body.error_message
        });
      }
    } catch (e) {
      console.error('=== createChannel ===', e);
      notification.open({
        title: t('requestError'),
        description: e.message
      });
    } finally {
      setLoading(false);
    }
  }, [type, topic, setLoading, history, t]);

  return (
    <Space direction="vertical">
      <Radio.Group size="small" value={type} onChange={e => setType(e.target.value)}>
        <Radio.Button shape="circle" size="small" title={t('open')} value="open"><RocketOutlined />Open</Radio.Button>
        <Radio.Button shape="circle" size="small" title={t('social')} value="social"><TeamOutlined />Social</Radio.Button>
        <Radio.Button shape="circle" size="small" title={t('private')} value="private"><LockOutlined />Private</Radio.Button>
      </Radio.Group>
      <Search size="small" placeholder="Topic" loading={loading} value={topic} onChange={e => setTopic(e.target.value)} allowClear enterButton={<ArrowRightOutlined />} onSearch={doCreateChannel}/>
    </Space>
  )
}

export default CreateChannel;
