import { Button, notification, Slider, Space } from "antd";
import { useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import path from 'path';
import { shell } from 'electron';
import { muteLocal, setVoicePitch, startRecord, stopRecord } from '../rtc';
import { AudioMutedOutlined, AudioOutlined, BorderOutlined, CloudDownloadOutlined, FireFilled, FireOutlined, VerticalAlignBottomOutlined } from "@ant-design/icons";
import { acceptSpeakerInvite, audienceReply, getChannel, uninviteSpeaker } from "../chapi";
import { userInfoContext } from "../context";

const RecordTool = ({topic, channel, isMeSpeaking, isHandraiseEnabled, onAcceptSpeakerInvite, onMoveToAudience}) => {
  const [recording, setRecording] = useState(false);
  const [file, setFile] = useState();
  const { t } = useTranslation();
  const [muted, setMuted] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(isMeSpeaking);
  const [isRaising, setIsRaising] = useState(false);
  const [userInfo, ] = useContext(userInfoContext);
  const [isMovingToAudience, setIsMovingToAudience] = useState(false);

  useEffect(() => {
    muteLocal(true);
    setVoicePitch(1.0);
    console.log('=== mute in new channel ===', channel);
  }, [channel])

  const start = () => {
    setRecording(true);
    setFile(startRecord(topic));
  }

  const stop = useCallback(() => {
    stopRecord();
    setRecording(false);
    console.log('=== record ===', file);
    notification.open({
      duration: 0,
      message: t('recordSuccess'),
      description: <Button type="link" style={{wordWrap: 'break-word', whiteSpace: 'pre-wrap', textAlign: 'left'}} onClick={() => shell.openPath(path.dirname(file))}>{file}</Button>
    });
  }, [file, t]);

  const moveToAudience = useCallback(async () => {
    try {
      setIsMovingToAudience(true);
      const resp = await uninviteSpeaker(channel, userInfo.userId);
      console.log('=== uninviteSpeaker ===', {channel, userId: userInfo.userId}, resp);
      if (resp.status === 200 && resp.body.success) {
        onMoveToAudience();
      }
    } catch (e) {
      console.error('=== moveToAudience ===', e);
    } finally {
      setIsMovingToAudience(false);
    }
  }, [channel, userInfo.userId, onMoveToAudience])

  const toggleRaiseHand = useCallback(async () => {
    try {
      setIsRaising(true);
      const r = !isHandRaised;
      const resp = await audienceReply(channel, r, !r);
      console.log('=== audienceReply ===', {channel, raiseHands: r, unRaiseHands: !r},  resp);
      if (resp.body.success) {
        setIsHandRaised(r);

        const acceptTask = setInterval(async () => {
          try {
            const chResp = await getChannel(channel);
            if (chResp.status === 200 && chResp.body.success) {
              if (chResp.body.users.some(u => u.user_id === userInfo.userId)) {
                const resp = await acceptSpeakerInvite(channel, userInfo.userId);
                console.log('=== acceptSpeakerInvite ===', {channel, userId: userInfo.userId}, resp);
                if (resp.status === 200 && resp.body.success) {
                  onAcceptSpeakerInvite();
                  clearInterval(acceptTask);
                }
              }
            }
          } catch (e) {
            console.error('=== acceptSpeakerInvite ===', e)
          }
        }, 10 * 1000);

        return () => clearInterval(acceptTask);
      }
    } catch(e) {
      console.error('=== raiseHand ===', e);
    } finally {
      setIsRaising(false);
    }

  }, [channel, isHandRaised, userInfo.userId, onAcceptSpeakerInvite]);

  const toggleMuted = () => {
    setMuted(m => {
      muteLocal(!m);
      return !m;
    })
  }

  return (
    <Space style={{backgroundColor: 'white', border: '1px solid #c0c0c0', padding: '5px 10px 5px 10px'}}>
      <Slider style={{width: '100px'}} min={0.5} max={2.0} step={0.01} defaultValue={1.0} onChange={setVoicePitch}/>
      <Button size="small" onClick={toggleMuted} shape="circle" title="mute" icon={muted ? <AudioMutedOutlined/> : <AudioOutlined/> }/>
      { isMeSpeaking ? (
        <Button size="small" onClick={moveToAudience} loading={isMovingToAudience} shape="circle"  title="Move to audient" icon={<VerticalAlignBottomOutlined/> }/>
      ) : (
        <Button size="small" onClick={toggleRaiseHand} loading={isRaising} disabled={!isHandraiseEnabled} shape="circle"  title="Raise Hand" icon={isHandRaised ? <FireFilled/> : <FireOutlined/> }/>
      )}

      { recording ? (
        <Button size="small" danger title="Stop Record" shape="circle" onClick={stop} icon={<BorderOutlined/>} style={{animation: 'animateHeart 1.2s infinite'}}/>
      ) : (
        <Button size="small" danger onClick={start} shape="circle" title="Record" icon={<CloudDownloadOutlined/>}/>
      )}
    </Space>
  )
}

export default RecordTool;
