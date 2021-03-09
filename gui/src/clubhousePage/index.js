import { Button, Card, Col, Empty, Input, Layout, notification, Popover, Row, Space, Tooltip, Typography } from 'antd';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { remote, shell } from 'electron';
import fs from 'fs';
import path from 'path';

import { getChannels } from '../chapi';
import TopicPage from './topicPage';

import './selected.css';
import { BulbTwoTone, PoweroffOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { userInfoContext } from '../context';
import CreateChannel from './createChannel';

const { Sider, Content } = Layout;
const { Paragraph, Text } = Typography;
const { Search } = Input;

const ClubHousePage = () => {
  const { t } = useTranslation();
  const [userInfo, setUserInfo] = useContext(userInfoContext);
  const history = useHistory();
  const {url} = useRouteMatch();
  const [channels, setChannels] = useState([]);
  const [updating, setUpdating] = useState(true);
  const [searchText, setSearchText] = useState();

  const updateChannel = useCallback(async () => {
    setUpdating(true);
    try {
      const resp = await getChannels();
      if (resp.status === 401) {
        // token invaild
        history.push('/login');
        return;
      } else if (resp.body.success) {
        console.log('=== getChannels ===', resp);
        setChannels(resp.body.channels);
      } else {
        notification.open({
          duration: 0,
          message: t('apiError'),
          description: resp.body.error_message
        });
      }
    } catch (e) {
      notification.open({
        duration: 0,
        message: t('requestError'),
        description: e.toString()
      });
    }
    setUpdating(false);
  }, [history, t]);

  const onSearch = text => {
    setSearchText(text);
  }

  useEffect(() => {
    (async () => {
      if (!userInfo || !userInfo.userId) {
        console.log('login require, goto /login');
        history.push('/login');
        return;
      } else {
        await updateChannel();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateChannel, userInfo, setUserInfo]);

  const exportAuth = useCallback(async () => {
    try {
      const defaultDir = process.platform !== 'win32' ? remote.app.getPath('home') : path.join(remote.app.getPath('home'), 'Desktop');
      const { canceled, filePath } = await remote.dialog.showSaveDialog({
        title: t('exportAuthorized'),
        defaultPath: path.join(defaultDir, 'auth.json'),
        filters: [{
          name: 'json', extensions: ['json']
        }]
      });
      if (!canceled && filePath.length > 0) {
        await fs.promises.writeFile(filePath, JSON.stringify({
          userId: userInfo.userId, userToken: userInfo.userToken, userDevice: userInfo.userDevice
        }));
        const dir = path.dirname(filePath);
        notification.open({
          message: t('saveSuccess'),
          description: (
            <Button type="link"
              style={{wordWrap: 'break-word', whiteSpace: 'pre-wrap', textAlign: 'left'}}
              onClick={() => shell.openPath(dir)}>{filePath}
            </Button>
          )
        });
      }
    } catch (e) {
      notification.open({
        duration: 0,
        message: t('saveFail'),
        description: e.message
      });
    }
  }, [userInfo, t]);

  return (
    <Layout style={{height: '100%'}}>
      <Sider style={{padding: '8px 8px 8px 8px', overflowY: 'scroll', overflowX: 'hidden', position: 'relative'}} width={'38.2%'}>
        <Space direction="vertical" style={{width: '100%', paddingTop: 85}}>
          {filterChannels(channels, searchText).map(ch => (
            <NavLink key={ch.channel_id} to={{pathname: `${url}/${ch.channel}`}} activeClassName="selected">
              <Card title={ch.channel_id} type="inner" >
                <Paragraph><Text strong>{t('topic')}</Text>: {highlight(ch.topic, searchText)}</Paragraph>
                <Paragraph><Text strong>{t('numberParticipants')}</Text>: {ch.num_speakers}/{ch.num_all}</Paragraph>
                <Paragraph>
                  <ul>
                    {ch.users.map(user => (
                      <li key={user.user_id}>{highlight(user.name, searchText)}</li>
                    ))}
                  </ul>
                </Paragraph>
              </Card>
            </NavLink>
          ))}
        </Space>
        <div style={{'position': 'fixed', width:'calc(38.2% - 18px)', top: 0, left: 0, padding: 8, backgroundColor: '#001529'}}>
          <Card >
            <Space>
              <Tooltip title={t('refresh')}>
                <Button type="primary" shape="circle" size="small" loading={updating} icon={<ReloadOutlined />} onClick={updateChannel}/>
              </Tooltip>
              <Tooltip title={t('exportAuthorized')}>
                <Button shape="circle" size="small" icon={<SaveOutlined />} onClick={exportAuth}/>
              </Tooltip>
              <Popover title={t('createRoom')} content={<CreateChannel/>}>
                <Button title={t('createRoom')} shape="circle" size="small" icon={<BulbTwoTone />}/>
              </Popover>
              <Tooltip title={t('logout')}>
                <Button danger shape="circle" size="small" icon={<PoweroffOutlined />} onClick={logout}/>
              </Tooltip>
              <Search size="small" placeholder="Search" allowClear onSearch={onSearch} enterButton={false}/>
            </Space>
          </Card>
        </div>
      </Sider>
      <Content style={{padding: '8px 8px 8px 8px', overflowY: 'scroll'}}>
        <Switch>
          <Route path={`${url}/:channel`} component={TopicPage}/>
          <Route exact path={`${url}`}>
            <Row style={{height: '100%'}} align="middle">
              <Col flex={1}>
                <Empty description={t('waitSel')} />
              </Col>
            </Row>
          </Route>
        </Switch>
      </Content>
    </Layout>
  );

  function logout() {
    localStorage.removeItem('userInfo');
    history.push('/login');
  }

}

function filterChannels(channels, searchText) {
  if (!searchText) {
    return channels;
  }

  return channels.filter(ch => {
    const searchWords = searchText.split(/\s/)
    const searchContext = [ch.topic, ...ch.users.map(u => u.name)];
    return searchContext.some(context => {
      return searchWords.some(w => context && new RegExp(w,'ig').test(context));
    });
  });
}

function highlight(content, searchText) {
  if (!(searchText && content)) {
    return content;
  }

  let counter = 1;
  const words = searchText.split(/\s/).filter(d => d);

  const regExp = new RegExp(`(${words.join('|')})`, 'ig');
  const parts = content.split(regExp);
  return parts.map(part => {
    return words.some(w => part.toLowerCase() === w.toLowerCase()) ? <Text mark key={counter++}>{part}</Text> : part;
  });
}

export default ClubHousePage;
