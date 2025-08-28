# Multiplayer Card Game Deployment Guide

## Prerequisites

1. **Firebase Project**: Make sure your Firebase project is set up
2. **Domain**: A domain name for your production app
3. **Server**: A server to host the Socket.IO backend (VPS, Heroku, Railway, etc.)

## Step 1: Deploy Firestore Rules

1. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init firestore
   ```

4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 2: Deploy the Socket.IO Server

### Option A: Deploy to Railway (Recommended)

1. Create a Railway account at https://railway.app
2. Connect your GitHub repository
3. Create a new service from your repository
4. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=3001` (or let Railway auto-assign)
5. Railway will automatically detect the Node.js app and deploy it

### Option B: Deploy to Heroku

1. Create a Heroku account
2. Install Heroku CLI
3. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
4. Add the Node.js buildpack:
   ```bash
   heroku buildpacks:set heroku/nodejs
   ```
5. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   ```
6. Deploy:
   ```bash
   git push heroku main
   ```

### Option C: Deploy to VPS

1. Set up a VPS (DigitalOcean, AWS, etc.)
2. Install Node.js and PM2
3. Clone your repository
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the server with PM2:
   ```bash
   pm2 start server.js --name "card-game-server"
   pm2 save
   pm2 startup
   ```

## Step 3: Deploy the Next.js Frontend

### Option A: Deploy to Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-url.com`
3. Deploy

### Option B: Deploy to Netlify

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy

### Option C: Deploy to VPS

1. Build the production app:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## Step 4: Configure Domain and SSL

1. Point your domain to your hosting provider
2. Set up SSL certificates (Let's Encrypt for free)
3. Configure reverse proxy if needed (nginx)

## Step 5: Update Configuration

### Update Socket.IO Server CORS

In `server.js`, update the CORS origin to your actual domain:

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://your-actual-domain.com", "https://www.your-actual-domain.com"]
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})
```

### Update Frontend Socket URL

Set the environment variable in your hosting platform:

```bash
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-url.com
```

## Step 6: Test the Deployment

1. Visit your production domain
2. Log in to your account
3. Navigate to the Casino section
4. Try creating and joining a card game
5. Test the multiplayer functionality

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure the Socket.IO server CORS origin includes your frontend domain
2. **Connection Errors**: Verify the socket URL is correct and accessible
3. **Firebase Permissions**: Ensure Firestore rules are deployed correctly
4. **Port Issues**: Make sure the correct ports are open and accessible

### Environment Variables Checklist

- [ ] `NODE_ENV=production` (on server)
- [ ] `NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-url.com` (on frontend)
- [ ] Firebase configuration is correct
- [ ] CORS origins are properly configured

### Security Considerations

1. **Firebase Rules**: Only allow authenticated users to access card games
2. **CORS**: Restrict origins to your actual domains
3. **Environment Variables**: Don't commit sensitive data to version control
4. **SSL**: Always use HTTPS in production

## Monitoring

1. **Server Logs**: Monitor your Socket.IO server logs for errors
2. **Firebase Console**: Check Firestore usage and errors
3. **Vercel/Netlify**: Monitor frontend deployment status
4. **Uptime Monitoring**: Set up monitoring for your servers

## Scaling Considerations

1. **Multiple Socket.IO Servers**: Use Redis adapter for horizontal scaling
2. **Load Balancing**: Set up load balancer for multiple server instances
3. **Database**: Consider Firebase usage limits for high traffic
4. **CDN**: Use CDN for static assets

## Cost Optimization

1. **Serverless**: Consider serverless options for the Socket.IO server
2. **Firebase**: Monitor Firestore usage to optimize costs
3. **CDN**: Use free CDN tiers where possible
4. **Hosting**: Choose cost-effective hosting providers
