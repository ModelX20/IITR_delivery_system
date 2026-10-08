import { useEffect, useState } from 'react'
import './App.css'

const emptyForm = { studentName: '', item: '', pickupLocation: '', dropLocation: '' }
const STATUSES = ['pending', 'picked_up', 'delivered', 'cancelled']

function App() {
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  function loadOrders() {
    return fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => {
        setOrders(data)
        setError('')
      })
      .catch(() => setError('Could not reach the backend. Is it running on port 5000?'))
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      setError((await res.json()).error)
      return
    }
    setForm(emptyForm)
    loadOrders()
  }

  async function updateStatus(id, status) {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadOrders()
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  return (
    <main className="container">
      <h1>Campus Delivery System</h1>

      <section className="card">
        <h2>Place an order</h2>
        <form onSubmit={handleSubmit} className="order-form">
          <input name="studentName" placeholder="Your name" value={form.studentName} onChange={handleChange} />
          <input name="item" placeholder="What do you need?" value={form.item} onChange={handleChange} />
          <input name="pickupLocation" placeholder="Pickup from (e.g. Canteen)" value={form.pickupLocation} onChange={handleChange} />
          <input name="dropLocation" placeholder="Deliver to (e.g. Hostel A, Room 101)" value={form.dropLocation} onChange={handleChange} />
          <button type="submit">Place order</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Orders</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Item</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.studentName}</td>
                  <td>{o.item}</td>
                  <td>{o.pickupLocation}</td>
                  <td>{o.dropLocation}</td>
                  <td>
                    <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default App
