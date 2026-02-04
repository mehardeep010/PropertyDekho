CREATE DATABASE IF NOT EXISTS PropertyDekho;
USE PropertyDekho;

-- SET FOREIGN_KEY_CHECKS = 0;

-- DROP TABLE IF EXISTS PAYMENT;
-- DROP TABLE IF EXISTS TENANT_LEASE;
-- DROP TABLE IF EXISTS LEASE;
-- DROP TABLE IF EXISTS AGENT_INQUIRY;
-- DROP TABLE IF EXISTS INQUIRY;
-- DROP TABLE IF EXISTS PROPERTY_AMENITY;
-- DROP TABLE IF EXISTS PROPERTY;
-- DROP TABLE IF EXISTS AMENITY;
-- DROP TABLE IF EXISTS TENANT;
-- DROP TABLE IF EXISTS OWNER;
-- DROP TABLE IF EXISTS AGENT;

-- SET FOREIGN_KEY_CHECKS = 1;


###############################################################################################table creation 
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

############################################################################################sample data 
INSERT INTO AGENT VALUES (1, 'Ravi Sharma', '9876543210', 5.5);
INSERT INTO AGENT VALUES (2, 'Priya Singh', '9123456789', 4.0);

INSERT INTO OWNER VALUES (1, 'Amit Verma', '9988776655', 'amit@example.com');
INSERT INTO OWNER VALUES (2, 'Sita Gupta', '8877665544', 'sita@example.com');

INSERT INTO TENANT VALUES (1, 'John Doe', '7766554433', 'john@example.com');
INSERT INTO TENANT VALUES (2, 'Jane Smith', '6655443322', 'jane@example.com');

INSERT INTO AMENITY VALUES (1, 'Swimming Pool');
INSERT INTO AMENITY VALUES (2, 'Gym');
INSERT INTO AMENITY VALUES (3, 'Parking');

INSERT INTO PROPERTY VALUES (101, 'Luxury Villa', 'Villa', 'South Delhi', 50000000, 'Available', 48000000, 1, 1);
INSERT INTO PROPERTY VALUES (102, 'City Apartment', 'Apartment', 'Noida', 8000000, 'Available', 7500000, 2, 2);

INSERT INTO PROPERTY_AMENITY VALUES (101, 1);
INSERT INTO PROPERTY_AMENITY VALUES (101, 3);
INSERT INTO PROPERTY_AMENITY VALUES (102, 3); 

INSERT INTO INQUIRY VALUES (1, 'Interested in the Villa.', '2026-02-01', 'New', 1, 101, 1);
INSERT INTO INQUIRY VALUES (2, 'Is the apartment pet friendly?', '2026-02-02', 'Responded', 2, 102, 2);

INSERT INTO AGENT_INQUIRY VALUES (1, 1);
INSERT INTO AGENT_INQUIRY VALUES (2, 2);

INSERT INTO LEASE VALUES (5001, '2026-03-01', '2027-02-28', 25000, 50000, 102);

INSERT INTO TENANT_LEASE VALUES (2, 5001);

INSERT INTO PAYMENT VALUES (9001, '2026-03-05', 25000, 'Bank Transfer', 'Success', 5001);

##########################################################################testing 
SELECT 
    p.Property_ID, 
    p.Title, 
    p.Status, 
    p.Price, 
    o.Name AS Owner_Name, 
    a.Name AS Agent_Name,
    a.Phone AS Agent_Phone
FROM PROPERTY p
JOIN OWNER o ON p.Owner_ID = o.Owner_ID
JOIN AGENT a ON p.Agent_ID = a.Agent_ID;	

#####################################################################
SELECT Title, Location, Price, Type 
FROM PROPERTY 
WHERE Status = 'Available' 
AND Price < 50000000;
#####################################################################################
#index creation 
CREATE INDEX idx_property_location ON PROPERTY(Location);
CREATE INDEX idx_property_price ON PROPERTY(Price);
CREATE INDEX idx_property_status ON PROPERTY(Status);
CREATE INDEX idx_owner_email ON OWNER(Email);
CREATE INDEX idx_tenant_email ON TENANT(Email);
SHOW INDEX FROM PROPERTY;