import { useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import './App.css'

type Todo = {
  id: number | string
  name: string
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getTodos() {
      const { data, error: queryError } = await supabase
        .from('todos')
        .select('id, name')

      if (queryError) {
        setError(queryError.message)
      } else {
        setTodos(data ?? [])
      }
      setLoading(false)
    }

    void getTodos()
  }, [])

  return (
    <main className="todos-page">
      <section className="todos-card" aria-labelledby="todos-title">
        <p className="eyebrow">Supabase connection</p>
        <h1 id="todos-title">Todos</h1>
        {loading ? (
          <p role="status">Loading todos…</p>
        ) : error ? (
          <p className="message error" role="alert">Could not load todos: {error}</p>
        ) : todos.length ? (
          <ul className="todos-list">
            {todos.map((todo) => <li key={todo.id}>{todo.name}</li>)}
          </ul>
        ) : (
          <p className="message">No todos found.</p>
        )}
      </section>
    </main>
  )
}

export default App
