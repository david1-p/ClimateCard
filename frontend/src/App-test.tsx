function App() {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
        기후동행카드 🌿
      </h1>
      <p style={{ color: 'white', fontSize: '1.25rem', marginBottom: '2rem' }}>
        정상 작동 확인!
      </p>
      <div style={{
        padding: '2rem',
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}>
        <p style={{ color: '#333' }}>화면이 제대로 표시되었습니다!</p>
      </div>
    </div>
  )
}

export default App
