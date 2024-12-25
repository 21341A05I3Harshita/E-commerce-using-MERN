const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const nodemailer = require('nodemailer');



app.use(cors()); 
app.use(express.json());


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'water', 
    port: 3306 
});


db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to the database.");
    }
});
app.post('/get_del_orders', (req, res) => {
    console.log("Request Body:", req.body);
    const { user_district } = req.body; // Adjusted key to match frontend
    const value = [user_district];
    const getordersql = "SELECT * FROM orders WHERE user_district = ? AND order_receieved='not_yet_received'";
    db.query(getordersql, value, (error, result) => {
        if (error) {
            console.error("Error getting orders:", error);
            return res.status(500).send({ message: "Error retrieving orders.", error: error.message });
        }
        console.log("Orders Retrieved:", result);
        return res.status(200).send(result);
    });
});


app.post('/GetOrders', (req, res) => {
    console.log(req.body);
    const {user_id} = req.body;
    const value = [user_id];
    const getordersql = "SELECT * FROM orders WHERE user_id = ?";
    db.query(getordersql,value, (error, result) => {
        if (error) {
            console.log("Error getting orders", error);
            return res.status(500).send({ message: "Error getting orders", error: error.message });
        } else {
            return res.status(200).send(result); // Send the data directly
        }
    });
});

app.get('/GetOrderDetails/:orderId', (req, res) => {
    const { orderId } = req.params; // Extract orderId from the route parameter
    const getOrderDetailsSql = "SELECT * FROM orders WHERE order_id = ?";
    db.query(getOrderDetailsSql, [orderId], (error, result) => {
        if (error) {
            console.log("Error getting order details", error);
            return res.status(500).send({ message: "Error getting order details", error: error.message });
        } else if (result.length === 0) {
            return res.status(404).send({ message: "Order not found" });
        } else {
            return res.status(200).send(result[0]); // Send the first (and only) order object
        }
    });
});



app.post('/remove_ADC', (req, res) => {
    console.log(req.body);
    const { user_id, product_name, product_cost, product_quantity } = req.body;
    const value = [user_id, product_name, product_cost, product_quantity];
    const remove_ADC_sql = "DELETE FROM add_to_cart WHERE user_id = ? AND product_name = ? AND product_cost = ? AND product_quantity = ?";

    db.query(remove_ADC_sql, value, (error, result) => {
        if (error) {
            
            console.error("Error removing item from cart:", error);
            res.status(500).json({ message: "Error removing item from cart", error: error.message });
        } else {
            
            if (result.affectedRows > 0) {
                res.status(200).json({ message: "Item removed from cart successfully" });
            } else {
                
                res.status(404).json({ message: "Item not found in cart" });
            }
        }
    });
});


app.post('/placing_order', (req, res) => { 
    console.log(req.body);

    const { 
        user_id, 
        user_name, 
        user_email, 
        product_name,
        product_quantity, 
        product_cost,
        user_zipcode,
        user_state, 
        user_district, 
        user_address,
        user_post, 
        date_order_placed, 
        order_receieved,
        order_id 
    } = req.body;

    // Check for missing required fields and send specific error messages
    if (!user_id || !user_name || !user_email) {
        return res.status(400).send({ message: "Missing user information: user_id, user_name, or user_email." });
    } 
    
    if (!user_address || user_address.length === 0) {
        return res.status(400).send({ message: "Address is required." });
    }

    const placing_order_sql = `
        INSERT INTO orders 
        (user_id, user_name, user_email,product_name, product_quantity, product_cost,user_zipcode,user_state, user_district, user_address,user_post, date_order_placed,order_receieved,order_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?)
    `;
    
    const PlaceOrder_values = [
        user_id,
        user_name,
        user_email,
        product_name,
        product_quantity,
        product_cost,
        user_zipcode,
        user_state,
        user_district,
        user_address,
        user_post,
        date_order_placed,
        order_receieved,
        order_id
    ];

    db.query(placing_order_sql, PlaceOrder_values, (error, result) => {
        if (error) {
            console.error("Error placing order:", error); // Log error to console
            return res.status(500).send({ message: "Error placing order", error: error.message });
        } else {
            res.status(200).send({ message: "Order placed successfully", orderId: result.insertId });
        }
    });
});



app.get('/GetAddCart', (req, res) => {
    const addtocartsql = "SELECT product_name, product_cost, product_quantity FROM add_to_cart";
    
    db.query(addtocartsql, (error, result) => {
        if (error) {
            console.error('Error fetching cart items:', error);
            res.status(500).send('Error fetching cart items.');
        } else {
            res.status(200).json(result);  
        }
    });
});


app.post('/EditDetails', (req, res) => {
    console.log("Received data:", req.body);

    const editSql = "UPDATE regestired_users SET user_f_name = ?, user_phone = ?, user_email = ? WHERE user_id = ?";
    const { user_name, user_phone, user_email, user_id } = req.body;
    const values = [user_name, user_phone, user_email, user_id];

    db.query(editSql, values, (error, result) => {
        if (error) {
            console.error("Error updating user details:", error);
            res.status(500).send("Error updating user details.");
        } else if (result.affectedRows === 0) {
            
            res.status(404).send("User not found.");
        } else {
            res.status(200).send("User details updated successfully.");
        }
    });
});



app.post('/ADCcount', (req, res) => {
    console.log("Received data:", req.body);
    const adc_count_sql = "SELECT COUNT(user_id) AS count FROM add_to_cart WHERE user_id = ?";
    const value1 = req.body.value;

    db.query(adc_count_sql, [value1], (error, result) => {
        if (error) {
            console.error("Error executing query:", error);
            res.status(500).send("Database error");
        } else {
            console.log("Count result:", result[0].count);
            res.status(200).json({ count: result[0].count });
        }
    });
});


app.post('/ADC', (req, res) => {
    console.log("Received data:", req.body); // Debugging line to inspect req.body

    const adcsql = "INSERT INTO add_to_cart(user_id, product_name, product_cost, product_quantity) VALUES (?, ?, ?, ?)";
    
    const { user_id, product_name, product_cost, product_quantity } = req.body;
    const values = [user_id, product_name, product_cost, product_quantity];

    db.query(adcsql, values, (err, result) => {
        if (err) {
            console.error("Error inserting into add_to_cart:", err);
            return res.status(500).json({ error: "Failed to add to cart" });
        }
        console.log("Insert successful:", result);
        return res.status(201).json({ message: "Item added to cart successfully" });
    });
});



// Route to handle user login
app.post('/login', (req, res) => {
    console.log("Received login request body:", req.body); // Log the request body

    const { login_phone_input, login_password_input } = req.body;

    // Validate input
    if (!login_phone_input || !login_password_input) {
        return res.status(400).json({ error: "Phone number and password are required." });
    }

    const loginsql = "SELECT * FROM regestired_users WHERE user_phone = ?";

    db.query(loginsql, [login_phone_input], (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).json({ error: "Database query failed" });
        }

        console.log("Query results:", results); // Log the query results

        // Check if user exists
        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid phone number or password." });
        }

        const user = results[0];

        // Compare the provided password with the hashed password in the database
        bcrypt.compare(login_password_input, user.user_password, (err, isMatch) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).json({ error: "Password comparison failed" });
            }

            if (!isMatch) {
                return res.status(401).json({ error: "Invalid phone number or password." });
            }

            // Successful login
            res.status(200).json({
                message: "Login successful",
                user: {
                    id: user.user_id,
                    phone: user.user_phone,
                    name: user.user_f_name,
                    email: user.user_email
                }

            });
            
        });
    });
});

// Route to handle user registration
app.post('/water', (req, res) => {
    console.log("Received registration request body:", req.body); // Log the request body

    const { user_f_name, user_phone, user_email, user_password, user_confirm_password } = req.body;

    // Validate input
    if (!user_f_name || !user_phone || !user_email || !user_password || !user_confirm_password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    if (user_password !== user_confirm_password) {
        return res.status(400).json({ error: "Passwords do not match." });
    }

    const selectsql = "SELECT * FROM regestired_users WHERE user_phone = ? OR user_email = ?"; 

    db.query(selectsql, [user_phone, user_email], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: "Database query failed" });
        }

        if (results.length > 0) {
            return res.status(409).json({ error: "User with this phone number or email already exists." });
        }

        // Hash the password
        bcrypt.hash(user_password, 10, (err, hash) => {
            if (err) {
                console.error("Error hashing password:", err);
                return res.status(500).json({ error: "Password hashing failed" });
            }

            const sql1 = "INSERT INTO regestired_users (user_f_name, user_phone, user_email, user_password) VALUES (?, ?, ?, ?)";
            const values = [
                user_f_name,
                user_phone,
                user_email,
                hash // Use the hashed password
            ];

            // Execute the SQL Query
            db.query(sql1, values, (err, results) => {
                if (err) {
                    console.error("Error executing query:", err);
                    return res.status(500).json({ error: "Database query failed" });
                }
                console.log("Insert results:", results);
                return res.status(201).json({ message: "User registered successfully" });
            });
        });
    });
});

app.post('/del_login', (req, res) => {
    const { del_phone, del_password } = req.body;
  
    const del_login_sql = 'SELECT * FROM regestired_delivery WHERE del_phone = ?';
    db.query(del_login_sql, [del_phone], (error, result) => {
      if (error) {
        console.error("Error executing query:", error);
        return res.status(500).json({ error: "Database query failed" });
      }
  
      console.log("Query results:", result);
  
      if (result.length === 0) {
        return res.status(401).json({ error: "Invalid phone number or password." });
      }
  
      const user = result[0];
      bcrypt.compare(del_password, user.del_password, (err, isMatch) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return res.status(500).json({ error: "Password comparison failed" });
        }
  
        if (!isMatch) {
          return res.status(401).json({ error: "Invalid phone number or password." });
        }
  
        // Successful login
        res.status(200).json({
          message: "Login successful",
          user: {
            id: user.del_id,
            phone: user.del_phone,
            name: user.del_name,
            email: user.del_email,
            dist: user.del_district,
            sta: user.del_state
          },
        })
      });
    });
  });

app.post('/del_register', (req, res) => {
    console.log(req.body);
    const { del_name, del_state, del_district, del_phone, del_email, del_password } = req.body;

    const del_register_sql = "SELECT * FROM regestired_delivery WHERE del_phone = ? OR del_email = ?";
    db.query(del_register_sql, [del_phone, del_email], (error, result) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).json({ error: "Database query failed" });
        }
        if (result.length > 0) {
            return res.status(409).json({ error: "User with this phone number or email already exists." });
        }

        bcrypt.hash(del_password, 10, (err, hash) => {
            if (err) {
                console.error("Error hashing password:", err);
                return res.status(500).json({ error: "Password hashing failed" });
            }
            const insert_del_register_sql = 'INSERT INTO regestired_delivery (del_name, del_state, del_district, del_phone, del_email, del_password) VALUES (?, ?, ?, ?, ?, ?)';
            const values = [del_name, del_state, del_district, del_phone, del_email, hash];
            db.query(insert_del_register_sql, values, (error, result) => {
                if (error) {
                    console.error("Error executing query:", error);
                    return res.status(500).json({ error: "Database query failed" });
                }
                console.log("Insert results:", result);
                return res.status(201).json({ message: "User registered successfully" });
            });
        });
    });
});

app.post('/store_otp', (req, res) => {
    console.log(req.body);
    const { order_id, order_otp, user_email } = req.body;
    
    // Insert OTP into the database
    const value = [order_id, order_otp];
    const otp_sql = "INSERT INTO delivery_otps(order_id, order_otp) VALUES(?, ?)";
    
    db.query(otp_sql, value, (error, result) => {
        if (error) {
            return res.status(500).json({ message: "Error occurred" });
        }

        // Setup Nodemailer transport
        let transporter = nodemailer.createTransport({
            service: 'gmail', // You can use other services like 'Yahoo', 'Outlook', etc.
            auth: {
                user: 'aquaadrop.2003@gmail.com',  // Replace with your email address
                pass: 'albmrfckqjbaxvuj'    // Replace with your email password or app password
            }
        });

        // Email message details
        let mailOptions = {
            from: 'aquaadrop.2003@gmail.com',  // Replace with your email address
            to: user_email,                // Send OTP to the user's email
            subject: 'Your Order OTP',
            html: `<p>Your OTP for order <strong>${order_id}</strong> is: <strong>${order_otp}</strong></p>`
        };

        // Send email
        transporter.sendMail(mailOptions, (emailError, info) => {
            if (emailError) {
                console.error('Error sending email:', emailError);
                return res.status(500).json({ message: "OTP inserted, but failed to send email" });
            } else {
                console.log('Email sent: ' + info.response);
                return res.status(200).json({ message: "OTP inserted and email sent" });
            }
        });
    });
});

app.post('/verifyotp', (req, res) => {
    const { order_id, order_otp } = req.body;

    if (!order_id || !order_otp) {
        return res.status(400).json({ message: "Order ID and OTP are required." });
    }

    // Verify OTP
    const otp_ver_sql = "SELECT * FROM delivery_otps WHERE order_id = ? AND order_otp = ?";
    db.query(otp_ver_sql, [order_id, order_otp], (error, result) => {
        if (error) {
            console.error("Database error during OTP verification:", error);
            return res.status(500).json({ message: "Internal server error during OTP verification." });
        }

        if (result.length === 0) {
            return res.status(400).json({ message: "Invalid OTP or Order ID." });
        }

        // OTP verified, update the order
        const update_sql = "UPDATE orders SET order_receieved = 'received' WHERE order_id = ?";
        db.query(update_sql, [order_id], (error, updateResult) => {
            if (error) {
                console.error("Database error while updating the order:", error);
                return res.status(500).json({ message: "Internal server error while updating the order." });
            }

            console.log("Order status updated successfully:", updateResult);

            // Delete the OTP
            const del_sql = "DELETE FROM delivery_otps WHERE order_otp = ?";
            db.query(del_sql, [order_otp], (error, delResult) => {
                if (error) {
                    console.error("Database error while deleting the OTP:", error);
                    return res.status(500).json({ message: "Internal server error while deleting the OTP." });
                }

                console.log("OTP deleted successfully:", delResult);
                return res.status(200).json({ 
                    message: "Order received successfully, and OTP deleted." 
                });
            });
        });
    });
});

app.post('/send_f_otp', (req, res) => {
    console.log(req.body);
    const {del_email,del_otp}=req.body;
    const value =[del_email,del_otp];
    const send_f_otp_sql = "SELECT del_email FROM regestired_delivery WHERE del_email =?";
    db.query(send_f_otp_sql,value,(error,result)=>{
        if(error){
            console.log(error);
            return res.status(500).send({message:"server error"});
        }
        db.query('INSERT INTO reset_password(email,otp) VALUES (?, ?)', value,(error1,result1)=>{
            if(error1){
                console.log(error1);
                return res.status(500).send({message:"server error"});
            } 
            let transporter = nodemailer.createTransport({
                service: 'gmail', // You can use other services like 'Yahoo', 'Outlook', etc.
                auth: {
                    user: 'aquaadrop.2003@gmail.com',  // Replace with your email address
                    pass: 'albmrfckqjbaxvuj'    // Replace with your email password or app password
                }
            });
    
            // Email message details
            let mailOptions = {
                from: 'aquaadrop.2003@gmail.com',  // Replace with your email address
                to: del_email,                // Send OTP to the user's email
                subject: 'Your password reset OTP',
                html: `<p>Your OTP  is: <strong>${del_otp}</strong></p>`
            };
    
            // Send email
            transporter.sendMail(mailOptions, (emailError, info) => {
                if (emailError) {
                    console.error('Error sending email:', emailError);
                    return res.status(500).json({ message: "OTP inserted, but failed to send email" });
                } else {
                    console.log('Email sent: ' + info.response);
                    return res.status(200).json({ message: "OTP inserted and email sent",result1 });
                }
            });

        });

    });
});

app.post('/confirm_pass', (req, res) => {
    console.log(req.body);
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
    }

    const cpsql = 'SELECT otp FROM reset_password WHERE otp = ?';
    db.query(cpsql, [otp], (error, result) => {
        if (error) {
            console.error("Error fetching OTP:", error);
            return res.status(500).json({ message: "Server error while verifying OTP" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Invalid OTP" });
        }

        const deleteSQL = 'DELETE FROM reset_password WHERE otp = ?';
        db.query(deleteSQL, [otp], (deleteError) => {
            if (deleteError) {
                console.error("Error deleting OTP:", deleteError);
                return res.status(500).json({ message: "Server error while deleting OTP" });
            }

            return res.status(200).json({ message: "OTP verified and deleted successfully" });
        });
    });
});

app.post("/confirm_passw", (req, res) => {
    console.log(req.body);
    const { del_email, del_password } = req.body;

    if (!del_email || !del_password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const sql1 = "SELECT * FROM regestired_delivery WHERE del_email = ?";
    db.query(sql1, [del_email], (error, result) => {
        if (error) {
            console.error("Error executing query:", error);
            return res.status(500).json({ error: "Database query failed" });
        }


        bcrypt.hash(del_password, 10, (err, hash) => {
            if (err) {
                console.error("Error hashing password:", err);
                return res.status(500).json({ error: "Password hashing failed" });
            }

            const updatesql = "UPDATE regestired_delivery SET del_password = ? WHERE del_email = ?";
            db.query(updatesql, [hash, del_email], (uperror, upresult) => {
                if (uperror) {
                    console.error("Error updating password:", uperror);
                    return res.status(500).json({ message: "Error updating password" });
                }

                console.log("Update results:", upresult);
                return res.status(201).json({ message: "Password updated successfully" });
            });
        });
    });
});

app.get('/get_pending', (req, res) => {
    db.query("SELECT * FROM orders WHERE order_receieved='not_yet_received'", (error, result) => {
        if (error) {
            console.error("Error occurred:", error);
            return res.status(500).json({ message: "Error occurred while fetching pending orders", error });
        }

        console.log("Pending orders count:", result.length); // Logging count instead of full result for clarity
        return res.status(200).json({ message: "Successfully got the details", data: result.length });
    });
});

app.get('/get_delivered', (req, res) => {
    db.query("SELECT * FROM orders WHERE order_receieved='received'", (error, result) => {
        if (error) {
            console.error("Error occurred:", error);
            return res.status(500).json({ message: "Error occurred while fetching delivered orders", error });
        }

        console.log("Delivered orders count:", result.length); // Logging count instead of full result for clarity
        return res.status(200).json({ message: "Successfully got the details", data: result.length });
    });
});

app.get('/monthlysales', (req, res) => {
    const year = req.query.year;  // Get the 'year' from the query parameters

    if (!year) {
        return res.status(400).send("Year is required.");
    }

    const getSql = `
        SELECT 
            months.month AS month, 
            COALESCE(SUM(o.product_quantity), 0) AS total_sold
        FROM (
            SELECT 1 AS month UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL 
            SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL 
            SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
        ) AS months
        LEFT JOIN orders o ON MONTH(o.date_order_placed) = months.month
            AND YEAR(o.date_order_placed) = ?
        GROUP BY months.month
        ORDER BY months.month;
    `;

    db.query(getSql, [year], (error, result) => {
        if (!error) {
            return res.status(200).json(result); // Return the result with all months for the selected year
        } else {
            console.error("Error fetching monthly sales:", error);
            return res.status(500).send("Internal Server Error");
        }
    });
});


app.get("/get_employees", (req, res) => {
    const get_sql='SELECT * FROM regestired_delivery';
    db.query(get_sql,(error,result) => {
        if(!error) {
            console.log(result);
            return res.status(200).send(result);
        }
        else{
            console.log(error);
            return res.status(500).json({message:"internal server error"});

        }
    });
});

app.get("/product_analysis", (req, res) => {
    const g_sql = `
        SELECT 
            product_name, 
            SUM(product_quantity) AS total_sold
        FROM orders
        GROUP BY product_name;
    `;
    db.query(g_sql, (error, result) => {
        if (!error) {
            return res.status(200).send(result); // Send the result to the frontend
        } else {
            console.log(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    });
});

app.get("/get_pending_order_details", (req, res) => {
    const gpodsql="SELECT * FROM orders WHERE order_receieved='not_yet_received'"
    db.query(gpodsql, (error, result) => {
        if(!error){
            console.log(result);
            return res.status(200).send(result);
        }
        else{
            console.log(error);
            return res.status(500).send("internal server error");
        }
    });
});

app.get("/get_delivered_order_details", (req, res) => {
    const gpodsql="SELECT * FROM orders WHERE order_receieved='received'"
    db.query(gpodsql, (error, result) => {
        if(!error){
            console.log(result);
            return res.status(200).send(result);
        }
        else{
            console.log(error);
            return res.status(500).send("internal server error");
        }
    });
});

app.get("/get_total_order_details", (req, res) => {
    const gpodsql="SELECT * FROM orders"
    db.query(gpodsql, (error, result) => {
        if(!error){
            console.log(result);
            return res.status(200).send(result);
        }
        else{
            console.log(error);
            return res.status(500).send("internal server error");
        }
    });
});

// Start the Server
app.listen(8081, () => {
    console.log('Server is running at http://localhost:8081/');
});
    