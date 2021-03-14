import AgoraRtcEngine from 'agora-electron-sdk';
import EventEmitter from 'events';
import dayjs from 'dayjs';
import path from 'path';

// import PubNub from 'pubnub';

// export function subscribePubNub(userId, channel, pubnubToken, heartbeatInterval) {
//   const pubnub = new PubNub({
//     publishKey : 'pub-c-6878d382-5ae6-4494-9099-f930f938868b',
//     subscribeKey : 'sub-c-a4abea84-9ca3-11ea-8e71-f2b83ac9263d',
//     origin: 'clubhouse.pubnub.com',
//     authKey: pubnubToken,
//     uuid: userId,
//     ssl: true,
//     heartbeatInterval
//   });

//   pubnub.addListener({
//     message(...args) {
//       console.log('=== pubnub message ===', ...args);
//     }
//   });

//   pubnub.subscribe({
//     channels: [
//       `users.${userId}`, `channel_user.${channel}.${userId}`,
//       `channel_speakers.${channel}`, `channel_all.${channel}`
//     ]
//   });

//   return pubnub;
// }

const eventEmitter = new EventEmitter();

const rtcEngine = new AgoraRtcEngine();
rtcEngine.initialize('938de3e8055e42b281bb8c6f69c21f78', new Uint32Array([0xFFFFFFFF & 0xFFFFFFFE])[0]);

rtcEngine.enableLocalVideo(false);

rtcEngine.on('error', errorCode => eventEmitter.emit('error', errorCode, rtcEngine.getErrorDescription(errorCode)));
rtcEngine.on('userJoined', (uid, elapsed) => eventEmitter.emit('userJoined', uid, elapsed));
rtcEngine.on('userOffline', (uid, reason)  => eventEmitter.emit('userOffline', uid, reason));
rtcEngine.on('remoteAudioStateChanged', (uid, state, reason, elapsed) => eventEmitter.emit('remoteAudioStateChanged', uid, state, reason, elapsed));
rtcEngine.on('groupAudioVolumeIndication', (speakers, speakerNumber, totalVolume) => {
  eventEmitter.emit('groupAudioVolumeIndication', speakers, speakerNumber, totalVolume);
});

eventEmitter.on('error', (errorCode, errorDescription) => {
  if (errorCode !== 1003) { // ignore ERR_START_CAMERA(1003)
    console.error('=== rtc error ===', errorCode, errorDescription);
  }
});

rtcEngine.setAudioProfile(5, 3);
rtcEngine.enableAudioVolumeIndication(600, 3, false);

navigator.mediaDevices.ondevicechange = () => {
  const device = rtcEngine.getAudioPlaybackDevices()[0];
  if (device) {
    rtcEngine.setAudioPlaybackDevice(device.deviceid);
  }
}

export function joinRtcChannel(token, channel, info, userId) {
  rtcEngine.joinChannel(token, channel, info, userId);
}

export function leaveRtcChannel() {
  rtcEngine.leaveChannel();
}

export function onRtcEvent(event, fn) {
  eventEmitter.on(event, fn);
}

export function offRtcEvent(event, fn) {
  eventEmitter.off(event, fn);
}

export function startRecord(topic) {
  const file = path.join(window.process.env.USERPROFILE, 'Music', topic + '-' + dayjs().format('YYYYMMDDHHmmSSS') + '.acc');
  rtcEngine.startAudioRecording(file, 44100, 2);
  return file;
}

export function stopRecord() {
  rtcEngine.stopAudioRecording();
}

export function muteLocal(muted) {
  return rtcEngine.muteLocalAudioStream(muted);
}

export function setVoicePitch(pitch) {
  rtcEngine.setLocalVoicePitch(pitch);
}

export function startEchoTest() {
  return rtcEngine.startEchoTestWithInterval(2);
}

export function stopEchoTest() {
  return rtcEngine.stopEchoTest();
}
