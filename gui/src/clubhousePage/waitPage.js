import { AudioOutlined, LoadingOutlined } from '@ant-design/icons';
import { Button, Col, Empty, message, Row, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { startEchoTest, stopEchoTest } from '../rtc'

const { Paragraph } = Typography;

const WaitPage = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [echoTestStarted, setEchoTestStarted] = useState(false);
  useEffect(() => {
    return () => {
      if (echoTestStarted) {
        stopEchoTest();
        message.info('EchoTest stopped');
      }
    }
  }, [location, echoTestStarted]);

  return (
    <Row style={{height: '100%'}} align="middle" >
      <Col flex={1}>
        <Empty description={(
          <Typography>
            <Paragraph>{t('waitSel')}</Paragraph>
            <Paragraph><Button onClick={toggleTest} icon={echoTestStarted ? <LoadingOutlined /> : <AudioOutlined /> }>EchoTest</Button></Paragraph>
          </Typography>
        )}/>

      </Col>
    </Row>
  );

  function toggleTest() {
    setEchoTestStarted(started => {
      if (started) {
        stopEchoTest();
      } else {
        startEchoTest();
      }
      return !started;
    })
  }
}

export default WaitPage;
