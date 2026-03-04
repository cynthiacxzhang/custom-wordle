import { useState, useEffect } from 'react'
import './App.css'

const API_URL = 'http://localhost:8000'

function App() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching from API:', error)
        setMessage('Failed to connect to API')
        setLoading(false)
      })
  }, [])

  return (
    <>
      <h1>Wordle</h1>
      <div className="card">
        <p>API Response: {loading ? 'Loading...' : message}</p>
      </div>
    </>
  )
}

export default App
