const fs = require('fs');

async function testApi() {
    console.log("1. Testing User Signup...");
    const signupRes = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'testpassword' })
    });
    console.log('Signup Response:', await signupRes.json());

    console.log("\n2. Testing Login Success...");
    const loginRes = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'testpassword' })
    });
    console.log('Login Response:', await loginRes.json());

    console.log("\n3. Testing Login Failure & Lockout (3 attempts)...");
    for (let i = 1; i <= 4; i++) {
        const failRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser', password: 'wrongpassword' })
        });
        console.log(`Attempt ${i} Response (Status: ${failRes.status}):`, await failRes.json());
    }

    console.log("\n4. Testing Mock Image Upload...");
    const formData = new FormData();
    // Simulate a file upload
    const blob = new Blob(['dummy content'], { type: 'image/jpeg' });
    formData.append('image', blob, 'test.jpg');

    const uploadRes = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
    });
    console.log('Upload Response:', await uploadRes.json());
}

setTimeout(testApi, 1000); // Wait 1 second for server to boot
