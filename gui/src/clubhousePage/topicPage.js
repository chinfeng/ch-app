import { AudioMutedOutlined, LoadingOutlined, SettingOutlined, StarFilled, StarOutlined, UserOutlined, VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import { Avatar, Button, Typography, Card, Col, Divider, Drawer, notification, PageHeader, Result, Row, Space, Collapse, Badge, List, Checkbox } from "antd";
import ReactDOM from 'react-dom';
import { useCallback, useContext, useEffect, useState } from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import _ from 'lodash';

import { useTranslation } from "react-i18next";
import 'echarts';
import ReactECharts from 'echarts-for-react';

import { activePing, getChannel, getProfile, joinChannel, follow, unfollow, leaveChannel, makeModerator, uninviteSpeaker, inviteSpeaker} from "../chapi";
import { userInfoContext } from "../context";
import { joinRtcChannel, leaveRtcChannel, offRtcEvent, onRtcEvent/*, subscribePubNub*/ } from '../rtc';
import RecordTool from "./recordTool";

import topicStyle from './topic.module.css';

const { Panel } = Collapse;
const { Paragraph } = Typography;

const TopicPage = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const [userInfo, setUserInfo] = useContext(userInfoContext);
  const {channel} = useParams();
  const [isModerator, setModerator] = useState(false);
  // const [speakerPermission, setSpeakerPermission] = useState(false);
  const [spUsers, setSpUsers] = useState([]); // 说话用户
  const [auUsers, setAuUsers] = useState([]); // 听众
  const [isMeSpeaking, setMeSpeaking] = useState(false);
  const [topic, setTopic] = useState('');
  const [token, setToken] = useState();
  const [speakers, setSpeakers] = useState([]);
  const [muted, setMuted] = useState([]);

  const [followLoading, setFollowLoading] = useState(false);

  // popProfile
  const [selectedUserStatus, setSelectedUserStatus] = useState('hidden');
  const [selectedUser, setSelectedUser] = useState({});

  const [isHandraiseEnabled ,setHandraiseEnabled] = useState();

  // charts
  const [countTimeline, setCountTimeline] = useState([]);
  const [speakersTimeline, setSpeakersTimeline] = useState([]);
  const [statsOptions, setStatesOptions] = useState();
  const [statsEnabled, setStatsEnabled] = useState(false);

  useEffect(() => {
    const tid = setInterval(() => {
      if (!statsEnabled) {
        return;
      }

      if (countTimeline.length > 0) {
        setStatesOptions({
          xAxis: {
            name: 'Time',
            type: 'time',
            axisLabel: {
              formatter: '{HH}:{mm}'
            },
            axisPointer: {
              snap: false,
              label: {
                show: false,
              },
              handle: {
                show: true
              },
            },
            splitLine: {
              show: false
            }
          },
          yAxis: {
            name: 'Users',
            min: Math.max(0, Math.min(...countTimeline.map(d => d[1])) - 5),
            max: Math.max(...countTimeline.map(d => d[1])) + 5,
          },
          series: [{
            type: 'line',
            symbol: 'none',
            smooth: true,
            data: [...countTimeline, [new Date().getTime(), countTimeline.slice(-1)[0][1]]],
          }],
          tooltip: {
            triggerOn: 'none',
            formatter(params) {
              const [time, count] = params[0].data;
              const speakersTerm = speakersTimeline.filter(s => s[0] <= time).slice(-1)[0] || speakersTimeline[0];
              return createStatsTooltip(time, count, speakersTerm);
            },
          },
        });
      }
    }, 1000);
    return () => clearInterval(tid)
  }, [countTimeline, speakersTimeline, statsEnabled]);

  useEffect(() => {
    console.log('location change', location);
    setTopic('');
    setAuUsers([]);
    setSpUsers([]);
  }, [location])

  const popProfile = async userId => {
    setSelectedUserStatus('loading');
    const resp = await getProfile(userId);
    console.log('=== getProfile ===', {userId}, resp);
    if (resp.body.success) {
      setSelectedUser(resp.body.user_profile);
    } else {
      setSelectedUser({name: 'error', bio: resp.body.error_message});
    }
    setSelectedUserStatus('show');
  };

  const isFollowing = useCallback(userId => {
    return (userInfo.followingIds || []).indexOf(userId) >= 0
  }, [userInfo]);

  const doFollow = useCallback(async userId => {
    setFollowLoading(true);
    try {
      const resp = await follow(userId);
      console.log('=== follow ===', {userId}, resp);
      if (resp.body.success) {
        userInfo.followingIds.push(userId);
        setUserInfo({...userInfo});
      }
    } catch (e) {
      console.error('=== following ===', e);
    }
    setFollowLoading(false);
  }, [userInfo, setUserInfo]);

  const doUnfollow = useCallback(async userId => {
    setFollowLoading(true);
    try {
      const resp = await unfollow(userId);
      console.log('=== unfollow ===', {userId}, resp);
      if (resp.body.success) {
        const idx = userInfo.followingIds.indexOf(userId);
        userInfo.followingIds.splice(idx, 1);
        setUserInfo({...userInfo});
      }
    } catch(e) {
      console.error('=== unfollowing ===', e);
    }
    setFollowLoading(false);
  }, [userInfo, setUserInfo]);

  const setUsers = useCallback(users => {
    const newSpUsers = users.filter(user => user.is_speaker);
    setSpUsers(oldSpUsers => {
      const part1 = _.intersectionBy(oldSpUsers, newSpUsers, d => d.user_id);
      const part2 = _.differenceBy(newSpUsers, oldSpUsers, d => d.user_id);
      return [...part1, ...part2];
    });

    const newAuUsers = users.filter(user => !user.is_speaker);
    setAuUsers(oldAuUsers => {
      const part1 = _.intersectionBy(oldAuUsers, newAuUsers, d => d.user_id);
      const part2 = _.differenceBy(newAuUsers, oldAuUsers, d => d.user_id);
      return [...part1, ...part2];
    });

    const me = _.find(newSpUsers, u => u.user_id === userInfo.userId);
    if (me) {
      console.log(me)
      setMeSpeaking(me.is_speaker);
      setModerator(me.is_moderator);
    }
  }, [userInfo.userId]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await joinChannel(channel, 'rtc', 'e30=');
        console.log(`=== joinChannel ===` , {channel}, resp);
        if (resp.body.success) {
          setUsers(resp.body.users);
          setTopic(resp.body.topic);
          setToken(resp.body.token);
          setHandraiseEnabled(resp.body.is_handraise_enabled);

          setCountTimeline([[new Date().getTime() - 1000, resp.body.users.length]]);
          setSpeakersTimeline([]);

          // const pubnub = subscribePubNub(userInfo.userId, channel, resp.body.pubnub_token, resp.body.pubnub_heartbeat_interval);
          // return () => pubnub.unsubscribeAll()

        } else {
          notification.open({
            duration: 0,
            message: t('apiError') + ' /join_channel',
            description: resp.body.error_message
          });
        }
      } catch(e) {
        notification.open({
          duration: 0,
          message: t('requestError') + ' /join_channel',
          description: e.toString()
        });
      }
      // setSpeakerPermission(!!users.find(u => u.user_id === userInfo.userId && u.is_speaker))
    })();

    return () => {
      // ensure leaveChannel before leaveRtcChannel to avoid token invaild
      setTimeout(async () => {
        try {
          const resp = await leaveChannel(channel);
          console.log(`=== leaveChannel ===`, {channel}, resp);
        } catch(e) {
          notification.open({
            duration: 0,
            message: t('requestError')  + ' /leave_channel',
            description: e.toString()
          });
        }
      });
    }
  }, [channel, setUsers, t]);

  // active_ping
  useEffect(() => {
    const handle = setInterval(async () => {
      try {
        const resp = await activePing(channel);
        if (resp.status !== 200) {
          notification.open({
            message: t('apiError') + ' /active_ping',
            description: JSON.stringify(resp)
          });
        } else {
          console.log('=== activePing ===', resp);
        }
      } catch (e) {
        notification.open({
          message: t('requestError') + ' /active_ping',
          description: e.toString()
        });
      }
    }, 30 * 1000)

    return () => clearInterval(handle);
  }, [channel, t]);

  useEffect(() => {
    // join channel with agorartc
    if (token) {
      console.log(`join rtc channel: ${token} ${channel} ${userInfo.userId}`);

      const refreshTask = setInterval(async () => {
        if (!statsEnabled) {
          return;
        }

        try {
          const resp = await getChannel(channel);
          console.log('=== getChannel ===', {channel}, resp);
          if (resp.body.success) {
            const time = new Date().getTime();
            setUsers(resp.body.users);
            setHandraiseEnabled(resp.body.is_handraise_enabled);
            setCountTimeline(ctl => {
              const last = ctl.slice(-1)[0] || [];
              const [, lastCount] = last;

              if (!(lastCount === resp.body.users.length)) {
                return [...ctl, [time, resp.body.users.length]]
              } else {
                return ctl;
              }
            });
          } else {
            notification.open({
              message: t('apiError') + ' /get_channel',
              description: resp.body.error_message
            });
          }
        } catch (e) {
          notification.open({
            message: t('requestError') + ' /get_channel',
            description: e.toString()
          });
        }
      }, 5000)

      const remoteAudioStateChanged = (uid, state, reason, elapsed) => {
        switch(reason) {
          case 3:
          case 4:
            console.log('=== localAudioState ===', {uid, state, reason, elapsed});
            break;
          case 5:
            setMuted(allMuted => {
              if (allMuted.indexOf(uid) < 0) {
                return [...allMuted, uid];
              } else {
                return allMuted;
              }
            })
            break;
          case 6:
            setMuted(allMuted => {
              const idx = allMuted.indexOf(uid) ;
              if (idx >= 0) {
                return allMuted.filter(m => m !== uid);
              } else {
                return allMuted;
              }
            })
            break;
          default:
        }
      }
      onRtcEvent('remoteAudioStateChanged', remoteAudioStateChanged);

      const onAudioVolumeIndication =async (speakers, speakerNumber, totalVolume) => {
        // etc: [{"uid":355697565,"volume":4},{"uid":1258067152,"volume":25}]
        const time = new Date().getTime();
        const term = speakers.filter(s => s.uid !== 0).map(s => spUsers.find(sp => sp.user_id === s.uid) || {user_id : s.uid});
        for (const u of term) {
          if (!u.username) {
            try {
              const resp = await getProfile(u.user_id);
              if (resp.body.success) {
                Object.assign(u, {...resp.body.user_profile})
              }
            } catch (e) {
              console.error('=== getProfile ===', e);
            }
          }
        }

        setSpeakersTimeline(tl => {
          const [, lastTerm] = tl.slice(-1)[0] || [];
          if (term.length > 0 && !term.every(c => lastTerm && lastTerm.some(l => c.user_id === l.user_id))) {
            return [...tl, [time, term]];
          } else {
            return tl;
          }
        });
        setSpeakers(speakers);
        setMuted(allMuted => {
          return _.difference(allMuted, speakers.map(s => s.uid));
        });
      }
      onRtcEvent('groupAudioVolumeIndication', onAudioVolumeIndication);

      return () => {
        clearInterval(refreshTask);
        offRtcEvent('groupAudioVolumeIndication', onAudioVolumeIndication);
        offRtcEvent('userMuteAudio', remoteAudioStateChanged);
      }
    }
  }, [token, channel, userInfo.userId, setUsers, spUsers, auUsers, statsEnabled, t])

  useEffect(() => {
    if (token) {
      joinRtcChannel(token, channel, '', userInfo.userId);
      return leaveRtcChannel;
    }
  }, [token, channel, userInfo.userId])

  const onAcceptSpeakerInvite = useCallback(() => {
    setMeSpeaking(true);

    setAuUsers(au => {
      const meInfo = au.find(u => u.user_id === userInfo.userId);
      if (meInfo) {
        setSpUsers(su => {
          return [...su, meInfo];
        });
        return au.filter(u => u.user_id !== userInfo.userId);
      } else {
        return au;
      }
    });
  }, [userInfo.userId]);

  const onMoveToAudience = useCallback(() => {
    setMeSpeaking(false);

    setSpUsers(su => {
      const meInfo = su.find(u => u.user_id === userInfo.userId);
      if (meInfo) {
        setAuUsers(au => {
          return [...au, meInfo];
        });
        return su.filter(u => u.user_id !== userInfo.userId);
      } else {
        return su;
      }
    });
  }, [userInfo.userId]);

  const doMakeModerator = useCallback(async userId => {
    try {
      const resp = makeModerator(channel, userId);
      if (resp.body.success) {
        spUsers.find(u => u.user_id === userId).is_moderator = true;
        setSpUsers([...spUsers]);
      } else {
        notification.open({
          title: t('apiError'),
          description: resp.body.error_message
        })
      }
    } catch (e) {
      notification.open({
        title: t('requestError'),
        description: e.message
      })
    }
  }, [channel, spUsers, t])

  const doUninviteSpeaker = useCallback(async userId => {
    try {
      const resp = uninviteSpeaker(channel, userId);
      if (resp.body.success) {
        const user = spUsers.find(u => u.user_id === userId);
        user.is_speaker = false;
        setSpUsers(spu => spu.filter(u => u.user_id !== userId));
        setAuUsers(aus => [...aus, user]);
      } else {
        notification.open({
          title: t('apiError'),
          description: resp.body.error_message
        })
      }
    } catch (e) {
      notification.open({
        title: t('requestError'),
        description: e.message
      })
    }
  }, [channel, spUsers, t])

  const doInviteSpeaker = useCallback(async userId => {
    try {
      const resp = inviteSpeaker(channel, userId);
      if (resp.body.success) {
        const user = auUsers.find(u => u.user_id === userId);
        user.is_speaker = true;
        setAuUsers(aus => aus.filter(u => u.user_id !== userId));
        setSpUsers(aus => [...aus, user]);
      } else {
        notification.open({
          title: t('apiError'),
          description: resp.body.error_message
        })
      }
    } catch (e) {
      notification.open({
        title: t('requestError'),
        description: e.message
      })
    }
  }, [channel, auUsers, t])

  if (spUsers.length === 0 && auUsers.length === 0 && !topic) {
    return <Result key={channel} icon={<LoadingOutlined/>} title="Loading" style={{height: '100%', paddingTop: '10%'}}/>;
  } else {
    return (
      <PageHeader
        onBack={() => history.push('.')}
        title={topic}
        style={{position: 'relative'}}
      >
        <Row align="middle">
          <Col align="right" flex={1} style={{textAlign: 'right', padding: '10px'}}>
            <RecordTool
              topic={topic}
              channel={channel}
              isMeSpeaking={isMeSpeaking}
              onAcceptSpeakerInvite={onAcceptSpeakerInvite}
              onMoveToAudience={onMoveToAudience}
              isHandraiseEnabled={isHandraiseEnabled}/>
          </Col>
        </Row>

        <Collapse ghost>
          <Panel header="Stats" key="1">
            <Checkbox
              checked={statsEnabled}
              onChange={e => {
                setStatsEnabled(e.target.checked);
                if (!e.target.checked) {
                  setCountTimeline([]);
                  setSpeakersTimeline([]);
                }
              }}>
              Enable Stats (May cause performance problem)
            </Checkbox>
            { (statsEnabled && !!statsOptions) && <ReactECharts option={statsOptions} lazyUpdate={true}/> }
          </Panel>
        </Collapse>

        <Divider orientation="left">Speakers</Divider>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItem: 'flex-start'}}>
          {spUsers.map(user => (
            <div key={user.user_id} style={{padding: '3px', width: '120px'}}>
              <div  className={topicStyle['ch-avatar']}
                style={{
                  border: '2px solid #bbb',
                  paddingTop: '1em',
                }}>
                { isModerator &&
                  <div class="show-on-hover" style={{position: 'absolute', left: 10, top: 10}}>
                    <Button size="small" type="link" icon={<VerticalAlignBottomOutlined />} onClick={() => doUninviteSpeaker(user.user_id)}/>
                  </div>
                }
                <Row align="middle">
                  <Col flex={1} style={{textAlign: 'center', padding: '5px', cursor: 'pointer'}}>
                    <Badge count={muted.indexOf(user.user_id) >= 0 ? <AudioMutedOutlined/> : 0}>
                      <div style={{position: 'relative'}}>
                        <Avatar size={72} className={topicStyle['user-avatar']} style={{
                          backgroundColor: isSpeaking(user.user_id, speakers) ? '#988A72' : 'transparent',
                          transition: 'background-color 1.2s ease-out',
                          animation: 'animateShake 1s infinite',
                        }}/>
                        <Avatar size={60} className={topicStyle['user-avatar']} style={{
                          position: 'absolute',
                          backgroundColor: 'white',
                          left: 'calc(50% - 30px)',
                          top: '6px'
                        }}/>
                        <Avatar src={user.photo_url} size={56} className={topicStyle['user-avatar']} style={{
                          position: 'absolute',
                          left: 'calc(50% - 28px)',
                          top: '8px'
                        }} onClick={() => popProfile(user.user_id)}/>
                      </div>
                    </Badge>
                  </Col>
                </Row>
                <Row align="top">
                  <Col flex={1} style={{textAlign: 'center', padding: '0.5em'}}>
                    <Paragraph ellipsis={true}>
                      {user.is_moderator ? (
                        <SettingOutlined title="Moderator" style={{color: '#1890ff'}}/>
                      ) : (
                        isModerator &&
                          <Button size="small" type="link" icon={<SettingOutlined title="Moderator" style={{color: '#bec8c8'}}/>} onClick={() => doMakeModerator(user.user_id)}/>
                      )}
                      {user.name}
                    </Paragraph>
                  </Col>
                </Row>
              </div>
            </div>
          ))}
        </div>
        <Collapse ghost>
          <Panel header="Audiences" key="1">
            <div style={{display: 'flex', flexWrap: 'wrap', alignItem: 'flex-start'}}>
              {auUsers.filter(user => !user.is_speaker).map(user => (
                  <div key={user.user_id} style={{padding: '3px', width: '100px'}}>
                    <div style={{border: '2px solid #bbb', paddingTop: '1em'}} className={topicStyle['ch-avatar']}>
                      { isModerator &&
                        <div class="show-on-hover" style={{position: 'absolute', left: 5, top: 5}}>
                          <Button size="small" type="link" icon={<VerticalAlignTopOutlined />} onClick={() => doInviteSpeaker(user.user_id)}/>
                        </div>
                      }
                      <Row align="middle">
                        <Col flex={1} style={{textAlign: 'center', padding: '5px', cursor: 'pointer'}}>
                          <Avatar src={user.photo_url} size={48}  onClick={() => popProfile(user.user_id)}/>
                        </Col>
                      </Row>
                      <Row align="top">
                        <Col flex={1} style={{textAlign: 'center', padding: '0.5em'}}>
                          <Paragraph ellipsis={true}>{user.name}</Paragraph>
                        </Col>
                      </Row>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        </Collapse>

        <Drawer
          getContainer={false}
          onClose={() => setSelectedUserStatus('hidden')}
          closable={false}
          placement="right"
          width={450}
          visible={selectedUserStatus === 'loading' || selectedUserStatus === 'show'}
          style={{position: 'fixed'}}
        >
          {selectedUserStatus === 'loading' ? (
            <Result icon={<LoadingOutlined/>} title="Loading" style={{height: '100%', paddingTop: '10%'}}/>
          ) : (
            <Space style={{height: '100%', width: '100%'}} direction="vertical">
              <Card
                actions={[
                  isFollowing(selectedUser.user_id) ? (
                    <Button
                      key="unfollow" title="unfollow"
                      loading={followLoading} disabled={!isFollowing(selectedUser.user_id)}
                      onClick={() => doUnfollow(selectedUser.user_id)}
                      icon={<StarFilled style={{color: '#adbac7'}}/>}
                    >Unfollow</Button>
                  ) : (
                    <Button
                      key="follow" title="follow"
                      loading={followLoading} disabled={isFollowing(selectedUser.user_id)}
                      onClick={() => doFollow(selectedUser.user_id)}
                      icon={<StarOutlined style={{color: '#adbac7'}}/>}
                    >Follow</Button>
                  )
                ]}
              >
                <Card.Meta
                  avatar={<Avatar src={selectedUser.photo_url} size={96} />}
                  title={`${selectedUser.name} @${selectedUser.username}`}
                  description={`Followers: ${selectedUser.num_followers}, Following: ${selectedUser.num_following}`}
                />
              </Card>
              <Card>
                <pre style={{height: '100%', wordWrap: 'break-word', whiteSpace: 'pre-wrap'}}>{selectedUser.bio}</pre>
              </Card>
            </Space>
          )}
        </Drawer>
      </PageHeader>
    );
  }
};

function isSpeaking(uid, speakers) {
  return _.some(speakers, s => s.uid === uid);
}


function createStatsTooltip (time, count, speakersTerm) {
  const term = (speakersTerm && speakersTerm[1]) || [];
  const fragment = document.createDocumentFragment();
  const tooltip = (
    <div style={{textAlign: 'right'}}>
      <h3>{new Date(time).toLocaleString()}</h3>
      <p>Count: {count}</p>
      <Divider/>
      <List>
        {
          term.map(sp => (
            <List.Item.Meta key={sp.user_id}
              avatar={sp.photo_url ? <Avatar src={sp.photo_url} /> : <Avatar icon={<UserOutlined />} />}
              title={sp.name}
              description={'@' + sp.username}
            />
          ))
        }
      </List>
    </div>
  );
  ReactDOM.render(tooltip, fragment)
  return fragment;
}


export default TopicPage;
