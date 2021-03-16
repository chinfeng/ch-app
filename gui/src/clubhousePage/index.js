import { Button, Col, Input, Layout, notification, Popover, Row, Space, Tooltip, Typography, Avatar } from 'antd';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import { remote, shell } from 'electron';
import fs from 'fs';
import path from 'path';

import { getChannels } from '../chapi';
import TopicPage from './topicPage';

import './clubhouse.css';
import { PlusOutlined, PoweroffOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { userInfoContext } from '../context';
import CreateChannel from './createChannel';
import UserProfile from './userProfile';
import WaitPage from './waitPage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faUser, faUserCircle } from '@fortawesome/free-solid-svg-icons';

const { Sider, Content, Header } = Layout;
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
      <Header style={{backgroundColor: '#e7e4d5'}}>
        <Row align="middle">
          <Col span={20} className="ch-toolbar">
            <Space>
              <Popover title={t('createRoom')} content={<CreateChannel/>}>
                <Button title={t('createRoom')} type="primary" shape="circle" size="small" icon={<PlusOutlined />}/>
              </Popover>
              <Tooltip title={t('refresh')}>
                <Button shape="circle" size="small" loading={updating} icon={<ReloadOutlined />} onClick={updateChannel}/>
              </Tooltip>
              <Tooltip title={t('exportAuthorized')}>
                <Button shape="circle" size="small" icon={<SaveOutlined />} onClick={exportAuth}/>
              </Tooltip>
              <Tooltip title={t('logout')}>
                <Button danger shape="circle" size="small" icon={<PoweroffOutlined />} onClick={logout}/>
              </Tooltip>
              <Search
                style={{transform: 'translateY(50%)'}}
                placeholder="Search" allowClear onSearch={onSearch} enterButton={false}/>
            </Space>
          </Col>
          <Col span={4} style={{textAlign: 'right'}}>
            <UserProfile />
          </Col>
        </Row>
      </Header>
      <Layout style={{height: 'calc(100% - 64px)'}}>
        <Sider style={{overflowY: 'scroll', overflowX: 'hidden', position: 'relative', backgroundColor: '#f2efe4'}} width={440}>
          {filterChannels(channels, searchText).map(ch => (
            <NavLink key={ch.channel_id} to={{pathname: `${url}/${ch.channel}`}} className="channel-box" activeClassName="selected">
              <div>
                <Paragraph
                  title={ch.topic}
                  ellipsis={{rows: 3}}
                  className="title-box">
                    <Text strong>{highlight(ch.topic, searchText)}</Text>
                </Paragraph>
                <div className="avatar-box">
                {ch.users.slice(0, 2).map(user => (
                  user.photo_url ? <Avatar key={user.user_id} src={user.photo_url} size={38}/> : <FontAwesomeIcon icon={faUserCircle} style={{width: 38, height: 38}} color="#9e999d"/>
                ))}
                </div>
                <div className="user-list-box">
                  <Paragraph>
                    <ul>
                      {getMatches(ch.users, 4, searchText).map(user => (
                        <li key={user.user_id}>{highlight(user.name, searchText)}</li>
                      ))}
                    </ul>
                  </Paragraph>
                </div>
                <div className="user-num-box">
                  <Paragraph>{ch.num_all} <FontAwesomeIcon icon={faUser}/> / {ch.num_speakers} <FontAwesomeIcon icon={faCommentDots}/> </Paragraph>
                </div>
              </div>
            </NavLink>
          ))}
        </Sider>
        <Content style={{padding: '8px 8px 8px 8px', overflowY: 'scroll', backgroundColor: '#fefefe'}}>
          <Switch>
            <Route path={`${url}/:channel`} component={TopicPage}/>
            <Route exact path={`${url}`} component={WaitPage}/>
          </Switch>
        </Content>
      </Layout>

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

function getMatches(users, num, searchText) {
  if (!searchText) {
    return users.slice(0, num);
  }

  const withMatch = users.map(user => {
    const searchWords = searchText.split(/\s/);
    const match = searchWords.some(w => {
      return 0 + !!(user.name && new RegExp(w,'ig').test(user.name));
    });
    return { ...user, match: match };
  });

  const match = withMatch.filter(user => user.match);
  if (match.length >= num) {
    return match.slice(0, num);
  } else {
    return [...match, ...withMatch.filter(user => !user.match).slice(0, num - match.length)];
  }
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
