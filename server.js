const express=require('express'),cors=require('cors'),mysql=require('mysql2/promise'),path=require('path');
const bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');
const db=mysql.createPool({host:process.env.DB_HOST||'localhost',user:process.env.DB_USER||'root',
 password:process.env.DB_PASS||'',database:process.env.DB_NAME||'travelgo',port:+(process.env.DB_PORT||3306),
 connectionLimit:3,ssl:['true','insecure'].includes(process.env.DB_SSL)?{rejectUnauthorized:process.env.DB_SSL==='true'}:undefined});
const SECRET=process.env.JWT_SECRET||'dev-secret-change-me';
const app=express();app.use(cors(),express.json(),express.static(path.join(__dirname,'public')));
const wrap=f=>(q,r,n)=>f(q,r,n).catch(e=>{console.error(e);r.status(500).json({success:false,message:'Server error'})});
const fail=(r,c,m)=>r.status(c).json({success:false,message:m});

app.get('/api/health',async(q,r)=>{try{await db.query('SELECT 1');r.json({ok:true})}catch(e){r.status(500).json({ok:false,error:e.code||'DB connection failed'})}});

// one-time setup: users table, bookings.user_id, default admin account
let ready;const init=()=>ready||(ready=(async()=>{
 await db.query(`CREATE TABLE IF NOT EXISTS users(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,password VARCHAR(100) NOT NULL,role ENUM('user','admin') DEFAULT 'user')`);
 try{await db.query('ALTER TABLE bookings ADD COLUMN user_id INT NULL')}catch(e){}
 const email=process.env.ADMIN_EMAIL||'admin@travelgo.com',pass=process.env.ADMIN_PASS||'admin123';
 const[[u]]=await db.query('SELECT id FROM users WHERE email=?',[email]);
 if(!u)await db.query('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',['Admin',email,await bcrypt.hash(pass,10),'admin']);
})().catch(e=>{ready=null;throw e}));
app.use('/api',wrap(async(q,r,next)=>{await init();next()}));
app.use('/api',(q,r,next)=>{try{q.user=jwt.verify((q.headers.authorization||'').slice(7),SECRET)}catch(e){}next()});
const need=role=>(q,r,next)=>!q.user?fail(r,401,'Please log in'):role&&q.user.role!==role?fail(r,403,'Admin access only'):next();
const sign=u=>({token:jwt.sign({id:u.id,role:u.role,name:u.name},SECRET,{expiresIn:'7d'}),user:{id:u.id,name:u.name,role:u.role}});

app.post('/api/auth/register',wrap(async(q,r)=>{
 const{name,email,password}=q.body;
 if(!name?.trim())return fail(r,400,'Name is required');
 if(!/^\S+@\S+\.\S+$/.test(email||''))return fail(r,400,'A valid email is required');
 if((password||'').length<6)return fail(r,400,'Password must be at least 6 characters');
 const[[ex]]=await db.query('SELECT id FROM users WHERE email=?',[email]);
 if(ex)return fail(r,409,'An account with this email already exists');
 const[res]=await db.query('INSERT INTO users(name,email,password) VALUES(?,?,?)',[name.trim(),email,await bcrypt.hash(password,10)]);
 r.status(201).json(sign({id:res.insertId,name:name.trim(),role:'user'}))}));
app.post('/api/auth/login',wrap(async(q,r)=>{
 const[[u]]=await db.query('SELECT * FROM users WHERE email=?',[q.body.email||'']);
 if(!u||!(await bcrypt.compare(q.body.password||'',u.password)))return fail(r,401,'Invalid email or password');
 r.json(sign(u))}));

app.get('/api/tours',wrap(async(q,r)=>{
 let sql='SELECT * FROM tours WHERE 1=1';const p=[];
 if(q.query.search){sql+=' AND (title LIKE ? OR destination LIKE ?)';p.push(`%${q.query.search}%`,`%${q.query.search}%`)}
 if(q.query.destination){sql+=' AND destination=?';p.push(q.query.destination)}
 if(q.query.maxPrice){sql+=' AND price<=?';p.push(+q.query.maxPrice)}
 const[rows]=await db.query(sql+' ORDER BY rating DESC',p);r.json(rows)}));
app.get('/api/tours/:id',wrap(async(q,r)=>{
 const[[t]]=await db.query('SELECT * FROM tours WHERE id=?',[q.params.id]);
 t?r.json(t):fail(r,404,'Tour not found')}));

const tourVals=b=>[b.title.trim(),b.destination.trim(),b.description||'',b.inclusions||'',+b.duration_days,+b.price,b.image||'https://picsum.photos/seed/'+Date.now()+'/800/500'];
const tourErr=b=>!b.title?.trim()||!b.destination?.trim()||!(+b.duration_days>0)||!(+b.price>0)?'Name, destination, duration and price are required':null;
app.post('/api/tours',need('admin'),wrap(async(q,r)=>{
 const e=tourErr(q.body);if(e)return fail(r,400,e);
 const[res]=await db.query('INSERT INTO tours(title,destination,description,inclusions,duration_days,price,image) VALUES(?,?,?,?,?,?,?)',tourVals(q.body));
 r.status(201).json({success:true,id:res.insertId})}));
app.put('/api/tours/:id',need('admin'),wrap(async(q,r)=>{
 const e=tourErr(q.body);if(e)return fail(r,400,e);
 const[res]=await db.query('UPDATE tours SET title=?,destination=?,description=?,inclusions=?,duration_days=?,price=?,image=? WHERE id=?',[...tourVals(q.body),q.params.id]);
 res.affectedRows?r.json({success:true}):fail(r,404,'Tour not found')}));
app.delete('/api/tours/:id',need('admin'),wrap(async(q,r)=>{
 try{const[res]=await db.query('DELETE FROM tours WHERE id=?',[q.params.id]);
  res.affectedRows?r.json({success:true}):fail(r,404,'Tour not found')}
 catch(e){if(e.code==='ER_ROW_IS_REFERENCED_2')return fail(r,400,'This tour has bookings, so it cannot be deleted');throw e}}));

app.post('/api/bookings',wrap(async(q,r)=>{
 const{tour_id,name,email,phone,travel_date,people}=q.body;const n=parseInt(people);
 if(!name?.trim())return fail(r,400,'Name is required');
 if(!/^\S+@\S+\.\S+$/.test(email||''))return fail(r,400,'A valid email is required');
 if(!/^\d{10}$/.test(phone||''))return fail(r,400,'Phone must be 10 digits');
 if(!travel_date||new Date(travel_date)<new Date())return fail(r,400,'Choose a future travel date');
 if(!(n>=1&&n<=20))return fail(r,400,'Guests must be between 1 and 20');
 const[[t]]=await db.query('SELECT price FROM tours WHERE id=?',[tour_id]);
 if(!t)return fail(r,404,'Tour not found');
 const total=t.price*n;  // server-side total, never trusted from client
 const[res]=await db.query('INSERT INTO bookings(tour_id,user_id,name,email,phone,travel_date,people,total_price) VALUES(?,?,?,?,?,?,?,?)',
  [tour_id,q.user?.id||null,name.trim(),email,phone,travel_date,n,total]);
 r.status(201).json({success:true,id:res.insertId,total_price:total})}));
app.get('/api/my-bookings',need(),wrap(async(q,r)=>{
 const[rows]=await db.query('SELECT b.*,t.title FROM bookings b JOIN tours t ON t.id=b.tour_id WHERE b.user_id=? ORDER BY b.id DESC',[q.user.id]);r.json(rows)}));
app.get('/api/bookings/:id',wrap(async(q,r)=>{
 const[[b]]=await db.query('SELECT b.*,t.title FROM bookings b JOIN tours t ON t.id=b.tour_id WHERE b.id=?',[q.params.id]);
 b?r.json(b):fail(r,404,'Booking not found')}));
app.get('/api/bookings',need('admin'),wrap(async(q,r)=>{
 const[rows]=await db.query('SELECT b.*,t.title FROM bookings b JOIN tours t ON t.id=b.tour_id ORDER BY b.id DESC');r.json(rows)}));
app.put('/api/bookings/:id/status',need('admin'),wrap(async(q,r)=>{
 if(!['Pending','Confirmed','Completed','Cancelled'].includes(q.body.status))return fail(r,400,'Invalid status');
 await db.query('UPDATE bookings SET status=? WHERE id=?',[q.body.status,q.params.id]);r.json({success:true})}));

const PORT=process.env.PORT||5001;
if(require.main===module)app.listen(PORT,()=>console.log('TravelGo on http://localhost:'+PORT));
module.exports=app; // Vercel imports the app as a serverless function
