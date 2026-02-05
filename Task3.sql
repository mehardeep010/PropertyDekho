CREATE DATABASE IF NOT EXISTS PropertyDekho;
USE PropertyDekho;

################################################################################
# DATABASE CLEANUP
################################################################################

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS TENANT_LEASE;
DROP TABLE IF EXISTS LEASE;
DROP TABLE IF EXISTS AGENT_INQUIRY;
DROP TABLE IF EXISTS INQUIRY;
DROP TABLE IF EXISTS PROPERTY_AMENITY;
DROP TABLE IF EXISTS PROPERTY;
DROP TABLE IF EXISTS AMENITY;
DROP TABLE IF EXISTS TENANT;
DROP TABLE IF EXISTS OWNER;
DROP TABLE IF EXISTS AGENT;
SET FOREIGN_KEY_CHECKS = 1;

################################################################################
# TABLE CREATION WITH CONSTRAINTS
################################################################################

CREATE TABLE AGENT (
    Agent_ID INT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL, 
    Commission_Rate DECIMAL(5,2) CHECK (Commission_Rate BETWEEN 0 AND 25)
);

CREATE TABLE OWNER (
    Owner_ID INT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL 
);

CREATE TABLE TENANT (
    Tenant_ID INT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL, 
    Email VARCHAR(100) UNIQUE NOT NULL 
);

CREATE TABLE AMENITY (
    Amenity_ID INT PRIMARY KEY,
    Amenity_Name VARCHAR(50) NOT NULL
);

CREATE TABLE PROPERTY (
    Property_ID INT PRIMARY KEY,
    Title VARCHAR(150) NOT NULL,
    Type VARCHAR(50),
    Location VARCHAR(100),
    Price DECIMAL(12, 2) CHECK (Price > 0), 
    Status VARCHAR(20) CHECK (Status IN ('Available', 'Sold', 'Rented', 'Pending')),
    AI_Est_Price DECIMAL(12, 2),
    Owner_ID INT NOT NULL,
    Agent_ID INT NOT NULL,
    FOREIGN KEY (Owner_ID) REFERENCES OWNER(Owner_ID), 
    FOREIGN KEY (Agent_ID) REFERENCES AGENT(Agent_ID) 
);

CREATE TABLE PROPERTY_AMENITY (
    Property_ID INT,
    Amenity_ID INT,
    PRIMARY KEY (Property_ID, Amenity_ID), 
    FOREIGN KEY (Property_ID) REFERENCES PROPERTY(Property_ID),
    FOREIGN KEY (Amenity_ID) REFERENCES AMENITY(Amenity_ID)
);

CREATE TABLE INQUIRY (
    Inquiry_ID INT PRIMARY KEY,
    Message TEXT,
    Date DATE NOT NULL,
    Status VARCHAR(20) CHECK (Status IN ('New', 'Responded', 'Closed')), 
    Tenant_ID INT NOT NULL,
    Property_ID INT NOT NULL,
    Agent_ID INT NOT NULL,
    FOREIGN KEY (Tenant_ID) REFERENCES TENANT(Tenant_ID), 
    FOREIGN KEY (Property_ID) REFERENCES PROPERTY(Property_ID),
    FOREIGN KEY (Agent_ID) REFERENCES AGENT(Agent_ID) 
);

CREATE TABLE AGENT_INQUIRY (
    Agent_ID INT,
    Inquiry_ID INT,
    PRIMARY KEY (Agent_ID, Inquiry_ID),
    FOREIGN KEY (Agent_ID) REFERENCES AGENT(Agent_ID),
    FOREIGN KEY (Inquiry_ID) REFERENCES INQUIRY(Inquiry_ID)
);

CREATE TABLE LEASE (
    Lease_ID INT PRIMARY KEY,
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    Monthly_Rent DECIMAL(10, 2) CHECK (Monthly_Rent > 0),
    Security_Deposit DECIMAL(10, 2),
    Property_ID INT NOT NULL,
    FOREIGN KEY (Property_ID) REFERENCES PROPERTY(Property_ID),
    CONSTRAINT chk_dates CHECK (End_Date > Start_Date) 
);

CREATE TABLE TENANT_LEASE (
    Tenant_ID INT,
    Lease_ID INT,
    PRIMARY KEY (Tenant_ID, Lease_ID),
    FOREIGN KEY (Tenant_ID) REFERENCES TENANT(Tenant_ID),
    FOREIGN KEY (Lease_ID) REFERENCES LEASE(Lease_ID)
);

CREATE TABLE PAYMENT (
    Payment_ID INT PRIMARY KEY,
    Payment_Date DATE NOT NULL,
    Amount DECIMAL(10, 2) CHECK (Amount > 0), 
    Method VARCHAR(50),
    Status VARCHAR(20) CHECK (Status IN ('Success', 'Failed', 'Pending')), 
    Lease_ID INT NOT NULL,
    FOREIGN KEY (Lease_ID) REFERENCES LEASE(Lease_ID) 
);

################################################################################
# INDEX CREATION FOR PERFORMANCE
################################################################################

CREATE INDEX idx_property_location ON PROPERTY(Location);
CREATE INDEX idx_property_price ON PROPERTY(Price);
CREATE INDEX idx_property_status ON PROPERTY(Status);
CREATE INDEX idx_owner_email ON OWNER(Email);
CREATE INDEX idx_tenant_email ON TENANT(Email);

################################################################################
# DATA POPULATION
################################################################################

INSERT INTO AGENT VALUES (1, 'Ravi Sharma', '9811223344', 5.5);
INSERT INTO AGENT VALUES (2, 'Priya Singh', '9876500001', 4.0);
INSERT INTO AGENT VALUES (3, 'Arjun Mehta', '9911002233', 3.0);

INSERT INTO OWNER VALUES (1, 'Amit Verma', '9988776655', 'amit.verma@gmail.com');
INSERT INTO OWNER VALUES (2, 'Sita Gupta', '8877665544', 'sita.gupta@yahoo.in');
INSERT INTO OWNER VALUES (3, 'Rajesh Khanna', '7700998822', 'rajesh.k@rediffmail.com');

INSERT INTO TENANT VALUES (1, 'Vikram Malhotra', '7766554433', 'vikram.m@outlook.com');
INSERT INTO TENANT VALUES (2, 'Sneha Reddy', '6655443322', 'sneha.reddy@gmail.com');
INSERT INTO TENANT VALUES (3, 'Anjali Menon', '5544332211', 'anjali.m@gmail.com');
INSERT INTO TENANT VALUES (4, 'Kabir Khan', '4433221100', 'kabir.khan@hotmail.com');

INSERT INTO AMENITY VALUES (1, 'Swimming Pool');
INSERT INTO AMENITY VALUES (2, 'Gym');
INSERT INTO AMENITY VALUES (3, 'Parking');
INSERT INTO AMENITY VALUES (4, 'Power Backup');
INSERT INTO AMENITY VALUES (5, 'Security 24x7');

INSERT INTO PROPERTY VALUES (101, '4BHK Luxury Villa, GK-1', 'Villa', 'South Delhi', 50000000, 'Available', 48000000, 1, 1);
INSERT INTO PROPERTY VALUES (102, '3BHK Sunface Apartment', 'Apartment', 'Sector 62, Noida', 8000000, 'Rented', 7500000, 2, 2);
INSERT INTO PROPERTY VALUES (103, '2BHK Builder Floor', 'Floor', 'Indirapuram', 4500000, 'Pending', 4600000, 3, 1);
INSERT INTO PROPERTY VALUES (104, 'Furnished Studio, Cyber City', 'Studio', 'Gurgaon', 12000000, 'Available', 11500000, 1, 3);
INSERT INTO PROPERTY VALUES (105, 'Green Valley Farmhouse', 'Farmhouse', 'Chattarpur', 85000000, 'Sold', 90000000, 2, 2);

INSERT INTO PROPERTY_AMENITY VALUES (101, 1);
INSERT INTO PROPERTY_AMENITY VALUES (101, 2);
INSERT INTO PROPERTY_AMENITY VALUES (101, 3);
INSERT INTO PROPERTY_AMENITY VALUES (102, 3);
INSERT INTO PROPERTY_AMENITY VALUES (102, 4);
INSERT INTO PROPERTY_AMENITY VALUES (104, 5);
INSERT INTO PROPERTY_AMENITY VALUES (105, 1);

INSERT INTO INQUIRY VALUES (1, 'Hi, can I visit the GK-1 Villa this Sunday?', '2026-02-01', 'New', 1, 101, 1);
INSERT INTO INQUIRY VALUES (2, 'Is the Noida apartment suitable for families?', '2026-02-02', 'Closed', 2, 102, 2);
INSERT INTO INQUIRY VALUES (3, 'What is the final price for the Studio?', '2026-02-05', 'Responded', 4, 104, 3);
INSERT INTO INQUIRY VALUES (4, 'Interested in Indirapuram floor.', '2026-02-06', 'New', 3, 103, 1);
INSERT INTO INQUIRY VALUES (5, 'Do you have more photos of the Villa?', '2026-02-07', 'New', 4, 101, 1);

INSERT INTO AGENT_INQUIRY VALUES (1, 1);
INSERT INTO AGENT_INQUIRY VALUES (2, 2);
INSERT INTO AGENT_INQUIRY VALUES (3, 3);
INSERT INTO AGENT_INQUIRY VALUES (1, 4);
INSERT INTO AGENT_INQUIRY VALUES (1, 5);

INSERT INTO LEASE VALUES (5001, '2026-03-01', '2027-02-28', 25000, 50000, 102);
INSERT INTO LEASE VALUES (5002, '2026-04-01', '2027-03-31', 45000, 90000, 104);

INSERT INTO TENANT_LEASE VALUES (2, 5001);
INSERT INTO TENANT_LEASE VALUES (1, 5002);

INSERT INTO PAYMENT VALUES (9001, '2026-03-01', 50000, 'UPI', 'Success', 5001);
INSERT INTO PAYMENT VALUES (9002, '2026-03-05', 25000, 'UPI', 'Success', 5001);
INSERT INTO PAYMENT VALUES (9003, '2026-03-10', 10000, 'Credit Card', 'Success', 5002);
INSERT INTO PAYMENT VALUES (9004, '2026-03-11', 25000, 'Net Banking', 'Failed', 5001);

################################################################################
# VERIFICATION AND ANALYTICS
################################################################################

SELECT p.Property_ID, p.Title, p.Status, p.Price, o.Name AS Owner, a.Name AS Agent
FROM PROPERTY p
JOIN OWNER o ON p.Owner_ID = o.Owner_ID
JOIN AGENT a ON p.Agent_ID = a.Agent_ID;

SELECT i.Date, t.Name AS Tenant_Name, p.Title AS Property_Interested, i.Message
FROM INQUIRY i
JOIN AGENT a ON i.Agent_ID = a.Agent_ID
JOIN TENANT t ON i.Tenant_ID = t.Tenant_ID
JOIN PROPERTY p ON i.Property_ID = p.Property_ID
WHERE a.Name = 'Ravi Sharma' AND i.Status = 'New';

SELECT l.Lease_ID, p.Title, SUM(pay.Amount) as Total_Collected
FROM LEASE l
JOIN PAYMENT pay ON l.Lease_ID = pay.Lease_ID
JOIN PROPERTY p ON l.Property_ID = p.Property_ID
WHERE pay.Status = 'Success'
GROUP BY l.Lease_ID, p.Title;

SELECT p.Title, p.Location, p.Price
FROM PROPERTY p
JOIN PROPERTY_AMENITY pa ON p.Property_ID = pa.Property_ID
JOIN AMENITY am ON pa.Amenity_ID = am.Amenity_ID
WHERE am.Amenity_Name = 'Swimming Pool';
