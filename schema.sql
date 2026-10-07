CREATE DATABASE IF NOT EXISTS travelgo;
USE travelgo;
CREATE TABLE IF NOT EXISTS tours(
 id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(120) NOT NULL, destination VARCHAR(60) NOT NULL,
 description TEXT, inclusions TEXT, duration_days INT NOT NULL, price INT NOT NULL,
 rating DECIMAL(2,1) DEFAULT 4.5, image VARCHAR(255));
CREATE TABLE IF NOT EXISTS bookings(
 id INT AUTO_INCREMENT PRIMARY KEY, tour_id INT NOT NULL, name VARCHAR(80) NOT NULL, email VARCHAR(120) NOT NULL,
 phone VARCHAR(20) NOT NULL, travel_date DATE NOT NULL, people INT NOT NULL, total_price INT NOT NULL,
 status ENUM('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(tour_id) REFERENCES tours(id));
INSERT INTO tours(title,destination,description,inclusions,duration_days,price,rating,image) VALUES
('Goa Beach Escape','Goa','Beaches, nightlife and Portuguese-era old town over three relaxed days.','Hotel stay,Airport transfer,Breakfast,Sightseeing',3,7999,4.8,'https://picsum.photos/seed/goa/800/500'),
('Manali Snow Adventure','Manali','Snow trails, Solang Valley and riverside cafes in the Himalayas.','Hotel stay,Breakfast,Rohtang permit,Guide',5,12999,4.7,'https://picsum.photos/seed/manali/800/500'),
('Kerala Backwaters','Kerala','Houseboat nights, tea hills in Munnar and Ayurvedic meals.','Houseboat,Meals,Transfers,Sightseeing',6,10999,4.9,'https://picsum.photos/seed/kerala/800/500'),
('Hyderabad Heritage Trail','Hyderabad','Charminar, Golconda Fort and a biryani tour of the old city.','Hotel stay,Breakfast,Guide,Entry tickets',2,4999,4.5,'https://picsum.photos/seed/hyd/800/500'),
('Royal Rajasthan','Rajasthan','Jaipur, Jodhpur and Udaipur palaces plus a desert camp night.','Hotels,Breakfast,Camel safari,Transfers',8,21999,4.8,'https://picsum.photos/seed/raj/800/500'),
('Goa Family Package','Goa','Kid-friendly resort, dolphin cruise and spice plantation visit.','Resort stay,Meals,Cruise,Transfers',4,9499,4.6,'https://picsum.photos/seed/goa2/800/500');
