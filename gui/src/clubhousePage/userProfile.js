import { useContext, useEffect, useState } from "react";
import { getOnlineFriends, me } from "../chapi";
import { userInfoContext } from "../context";
import jstz from 'jstz';
import { Avatar, Button, Card, Drawer, Space, Typography } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";

const { Paragraph, Text } = Typography;

const UserProfile = () => {
  const [userInfo, ] = useContext(userInfoContext);
  const [visible, setVisible] = useState(false);
  const [myInfo, setMyInfo] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const timezone = jstz.determine();
        const resp = await me(false, timezone.name(), false);
        if (resp.body.success) {
          console.log('=== me ===', resp);
          setMyInfo(resp.body.user_profile);
        } else {
          console.error('=== me ===', resp);
        }
      } catch (e) {
        console.error('=== me ===', e);
      }
    })()
  }, [userInfo.userId])

  useEffect(() => {
    if (visible) {
      updateOnlineUsers();
    }

    async function updateOnlineUsers() {
      try {
        const resp = await getOnlineFriends();
        if (resp.status === 200) {
          console.log('=== getOnlineFriends ===', resp);
          setOnlineUsers(resp.body.users);
        } else {
          console.error('=== getOnlineFriends ===', resp);
        }
      } catch (e) {
        console.error('=== getOnlineFriends ===', e);
      }
    }
  }, [visible])

  const toggle = () => {
    setVisible(v => !v);
  }

  return (
    <>
      <Button type="link" onClick={toggle} style={{top: 12}}>
        {myInfo.photh_url ? <Avatar src={myInfo.photh_url}/> : <FontAwesomeIcon icon={faUserCircle} style={{width: 32, height: 32}} color="#9e999d"/>}
      </Button>
      <Drawer
        closable={false}
        onClose={toggle}
        visible={visible}
        width={450}
      >
        <Space direction="vertical" style={{width: '100%'}}>
          <Card style={{height: '160px', textAlign: 'center'}}>
            <Button type="link">
              {myInfo.photh_url ? <Avatar src={myInfo.photh_url} size={96}/> : <FontAwesomeIcon icon={faUserCircle} style={{width: 96, height: 96}} color="#9e999d"/>}
            </Button>
          </Card>
          <Card style={{textAlign: 'center'}}>
            <Typography>
              <Paragraph>{myInfo.name}</Paragraph>
              <Paragraph><Text type="secondary">@{myInfo.username}</Text></Paragraph>
            </Typography>
          </Card>
          <Card>
            <pre style={{height: '100%', wordWrap: 'break-word', whiteSpace: 'pre-wrap'}}>{myInfo.bio}</pre>
          </Card>
          <Card>
            <Typography>
              <ul>
                {onlineUsers.map(user => (
                  <li style={{paddingBottom: '1em'}} key={user.user_id}>
                    <Avatar src={user.photo_url}/> {user.name}
                  </li>
                ))}
              </ul>
            </Typography>
          </Card>
        </Space>
      </Drawer>
    </>
  )
}

export default UserProfile;
