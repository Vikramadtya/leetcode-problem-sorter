async function run() {
  try {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'pwd' })
    });
    const data = await res.json();
    console.log('Success:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
