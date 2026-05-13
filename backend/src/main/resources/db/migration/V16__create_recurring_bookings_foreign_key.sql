ALTER TABLE bookings 
ADD COLUMN recurring_booking_id INT UNSIGNED NULL,
ADD FOREIGN KEY (recurring_booking_id) REFERENCES recurring_bookings(recurring_booking_id);