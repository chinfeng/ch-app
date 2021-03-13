import 'antd/dist/antd.css';

import { Suspense, useEffect, useState } from 'react';
import {
  HashRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';
import { ConfigProvider, Result } from 'antd';

import enUS from 'antd/es/locale/en_US'
import zhCN from 'antd/es/locale/zh_CN'

import './App.css';
import i18n from './i18n';

import { userInfoContext } from './context';

import ClubhousePage from './clubhousePage';
import LoginPage from './loginPage';
import { checkWaitlistStatus, getActionableNotifications, getFollowingIds, getNotifications, updateAuthHeaders } from './chapi';
import { LoadingOutlined } from '@ant-design/icons';

const locales = {
  'en': enUS, 'en-US': enUS, 'zh': zhCN, 'zh-CN': zhCN
}

function App() {
  const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('userInfo') || 'null'));
  const [toLogin, setToLogin] = useState(true);
  const [init, setInit] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (userInfo && !userInfo.followingIds) {
          updateAuthHeaders(userInfo);
          userInfo.followingIds = await getFollowingIds();
          const respChk = await checkWaitlistStatus();
          setToLogin(!(respChk.status === 200 && respChk.body.success && !respChk.body.is_waiting && respChk.body.is_onboarding));
          setUserInfo({...userInfo});
        }
      } catch (e) {
        console.error('=== getFollowingIds ===', e);
      } finally {
        setInit(false);
      }
    })();
  }, [userInfo]);

  useEffect(() => {
    if (!init) {
      const tn = setInterval(fetchNotification, 30000);
      const ta = setInterval(fetchActionableNotification, 10000)
      return () => {
        clearInterval(tn);
        clearInterval(ta);
      }
    }

    async function fetchNotification () {
      try {
        const notiResp = await getNotifications();
        console.log('=== getNotifications ===', notiResp);
        // TODO: display nofitication
      } catch (e) {
        console.error('=== getNotifications ===', e);
      }
    }

    async function fetchActionableNotification () {
      try {
        const notiActResp = await getActionableNotifications();
        console.log('=== getActionableNotifications ===', notiActResp);
        // TODO: Take actions. It hand raising in action notification?
      } catch (e) {
        console.error('=== getActionableNotifications ===', e);
      }
    }
  }, [init]);

  if (init) {
    return <Result icon={<LoadingOutlined/>} title="Loading" style={{height: '100%', paddingTop: '10%'}}/>;
  } else {
    return (
      <Suspense fallback="loading">
        <userInfoContext.Provider value={[userInfo, setUserInfo]}>
          <ConfigProvider locale={locales[i18n.language]} >
            <Router>
              <Switch>
                <Route path="/clubhouse" component={ClubhousePage}/>
                <Route path="/login" component={LoginPage}/>
                <Redirect exact from="/" to={toLogin ? '/login' : '/clubhouse'} />
              </Switch>
            </Router>
          </ConfigProvider>
        </userInfoContext.Provider>
      </Suspense>
    );
  }
}

export default App;
