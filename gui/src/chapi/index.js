
import { ipcRenderer } from 'electron';
import { v4 } from 'uuid';

const API_URL = 'https://www.clubhouseapi.com/api'

const API_BUILD_ID = '304'
const API_BUILD_VERSION = '0.1.28'
const API_UA = `clubhouse/${API_BUILD_ID} (iPhone; iOS 14.4; Scale/2.00)`

const deviceId = (() => {
  const last = localStorage.getItem('CH-DeviceId');
  if (!last) {
    const n = v4();
    localStorage.setItem('CH-DeviceId', n);
    return n;
  } else {
    return last;
  }
})();

const HEADERS = {
  'CH-Languages': 'en-JP,ja-JP',
  'CH-Locale': 'en_JP',
  'Accept': 'application/json',
  'Accept-Language': 'en-JP;q=1, ja-JP;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'CH-AppBuild': API_BUILD_ID,
  'CH-AppVersion': API_BUILD_VERSION,
  'User-Agent': API_UA,
  'Connection': 'close',
  'Content-Type': 'application/json; charset=utf-8',
  'Cookie': `__cfduid=${tokenHex(42)}${Math.ceil(Math.random() * 9)}`,
  'CH-DeviceId': deviceId,
};


const authHeaders = (() => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  return {
    'CH-UserID': userInfo.userId,
    'Authorization': `Token ${userInfo.userToken}`,
    'CH-DeviceId': userInfo.userDevice,
  }
})();

function tokenHex(bit) {
  return Array(bit).fill(0).map(() =>
    Math.ceil(Math.random() * 16).toString(16)).join('');
}

async function fetch(...args) {
  return await ipcRenderer.invoke('fetch', ...args.map(JSON.stringify));
}

function getAuthenticationHeaders() {
  return  {...HEADERS, ...authHeaders };
}

export async function startPhoneNumberAuth(phoneNumber) {
  const data = { 'phone_number': phoneNumber };
  const resp = await fetch(`${API_URL}/start_phone_number_auth`, { method: 'POST', body: JSON.stringify(data), headers: HEADERS });
  return JSON.parse(resp);
}

export async function completePhoneNumberAuth(phoneNumber, verificationCode) {
  const data = {
    'phone_number': phoneNumber,
    'verification_code': verificationCode
  }

  const resp = await fetch(`${API_URL}/complete_phone_number_auth`, { method: 'POST', body: JSON.stringify(data), headers: HEADERS });
  const respJson = JSON.parse(resp);
  respJson.headers['CH-DeviceId'] = respJson.headers['CH-DeviceId'] || HEADERS['CH-DeviceId'];

  return respJson;
}

export function updateAuthHeaders(userInfo) {
  Object.assign(authHeaders, {
    'CH-UserID': userInfo.userId,
    'Authorization': `Token ${userInfo.userToken}`,
    'CH-DeviceId': userInfo.userDevice,
  });
}

export async function getChannels() {
  const resp = await fetch(`${API_URL}/get_channels`, { headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function joinChannel(channel, attribution_source='feed', attribution_details='eyJpc19leHBsb3JlIjpmYWxzZSwicmFuayI6MX0=') {
  const data = {
    'channel': channel,
    'attribution_source': attribution_source,
    'attribution_details': attribution_details,
  }

  const resp = await fetch(`${API_URL}/join_channel`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function leaveChannel(channel) {
  const data = {
    'channel': channel,
    'channel_id': null,
  }

  const resp = await fetch(`${API_URL}/leave_channel`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function activePing(channel) {
  const data = {
    'channel': channel,
    'chanel_id': null
  }

  const resp = await fetch(`${API_URL}/active_ping`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function getChannel(channel, channelId=null) {
  const data = {
    'channel': channel,
    'chanel_id': channelId
  }

  const resp = await fetch(`${API_URL}/get_channel`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function getProfile(userId) {
  const data = {
    'user_id': userId
  }

  const resp = await fetch(`${API_URL}/get_profile`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function follow(userId, userIds=null, source=4, sourceTopicId=null) {
  const data = {
    'source_topic_id': sourceTopicId,
    'user_ids': userIds,
    'user_id': userId,
    'source': source
  }

  const resp = await fetch(`${API_URL}/follow`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function unfollow(userId) {
  const data = {
    'user_id': userId
  }

  const resp = await fetch(`${API_URL}/unfollow`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function me(returnBlockerIds=false, timezoneIdentifier='Asia/Tokyo', returnFollowingIds=false) {
  const data = {
    'return_blocked_ids': returnBlockerIds,
    'timezone_identifier': timezoneIdentifier,
    'return_following_ids': returnFollowingIds
  }

  const resp = await fetch(`${API_URL}/me`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function getFollowingIds() {
  const resp = await me(false, 'Asia/Tokyo', true);
  if (resp.body.success) {
    return resp.body.following_ids;
  } else {
    throw new Error(resp.body.error_message);
  }
}

export async function audienceReply(channel, raise_hands=true, unraise_hands=false) {
  const data = {
    'channel': channel,
    'raise_hands': raise_hands,
    'unraise_hands': unraise_hands
  }

  const resp = await fetch(`${API_URL}/audience_reply`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function acceptSpeakerInvite(channel, userId) {
  const data = {
    'channel': channel,
    'user_id': userId,
  }

  const resp = await fetch(`${API_URL}/accept_speaker_invite`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function uninviteSpeaker(channel, userId) {
  const data = {
    'channel': channel,
    'user_id': userId,
  }

  const resp = await fetch(`${API_URL}/uninvite_speaker`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function inviteSpeaker(channel, userId) {
  const data = {
    'channel': channel,
    'user_id': userId,
  }

  const resp = await fetch(`${API_URL}/invite_speaker`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function createChannel(topic='', userIds=[], isPrivate=false, isSocialMode=false) {
  const data = {
    'is_social_mode': isSocialMode,
    'is_private': isPrivate,
    'club_id': null,
    'user_ids': userIds,
    'event_id': null,
    'topic': topic
  }

  const resp = await fetch(`${API_URL}/create_channel`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function makeModerator(channel, userId) {
  const data = {
    'channel': channel,
    'user_id': userId
  }

  const resp = await fetch(`${API_URL}/make_moderator`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function updateName(name) {
  const data = {
    name
  }

  const resp = await fetch(`${API_URL}/update_name`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function updateUsername(username) {
  const data = {
    username
  }

  const resp = await fetch(`${API_URL}/update_username`, { method: 'POST', body: JSON.stringify(data), headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function checkWaitlistStatus() {
  const resp = await fetch(`${API_URL}/check_waitlist_status`, { method: 'POST', headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function getNotifications() {
  const resp = await fetch(`${API_URL}/get_notifications`, { headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function getActionableNotifications() {
  const resp = await fetch(`${API_URL}/get_actionable_notifications`, { headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}

export async function getOnlineFriends() {
  const resp = await fetch(`${API_URL}/get_online_friends`, { headers: getAuthenticationHeaders()});
  return JSON.parse(resp);
}
