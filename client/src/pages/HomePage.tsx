import ChatArea from '../components/ChatArea';

export default function HomePage() {
  return (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatArea />
    </div>
  );
}
