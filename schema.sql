
DROP DATABASE IF EXISTS property_mgmt;
CREATE DATABASE property_mgmt;
USE property_mgmt;

-- --------------------------------------------------------
-- CORE TABLES
-- --------------------------------------------------------
CREATE TABLE AGENT (
    Agent_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL UNIQUE,
    Commission_Rate DECIMAL(5,2) NOT NULL CHECK (Commission_Rate BETWEEN 0 AND 25)
);

CREATE TABLE OWNER (
    Owner_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL UNIQUE,
    Email VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE TENANT (
    Tenant_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NOT NULL UNIQUE,
    Email VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE AMENITY (
    Amenity_ID INT AUTO_INCREMENT PRIMARY KEY,
    Amenity_Name VARCHAR(100) NOT NULL UNIQUE 
);

CREATE TABLE PROPERTY (
    Property_ID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(200) NOT NULL,
    Type VARCHAR(50) NOT NULL,
    Location VARCHAR(255) NOT NULL,
    Price DECIMAL(14,2) NOT NULL CHECK (Price > 0),
    Status VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (Status IN ('Available','Sold','Rented','Pending')),
    AI_Est_Price DECIMAL(14,2) NULL,
    Owner_ID INT NOT NULL,
    Agent_ID INT NOT NULL,
    FOREIGN KEY (Owner_ID) REFERENCES OWNER(Owner_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (Agent_ID) REFERENCES AGENT(Agent_ID) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE PROPERTY_AMENITY (
    Property_ID INT NOT NULL,
    Amenity_ID INT NOT NULL,
    PRIMARY KEY (Property_ID, Amenity_ID),
    FOREIGN KEY (Property_ID) REFERENCES PROPERTY(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Amenity_ID) REFERENCES AMENITY(Amenity_ID) ON DELETE CASCADE
);

-- AGENT_INQUIRY TABLE REMOVED TO PREVENT REDUNDANCY AND INCONSISTENCY
CREATE TABLE INQUIRY (
    Inquiry_ID INT AUTO_INCREMENT PRIMARY KEY,
    Message TEXT NOT NULL,
    Date DATE NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (Status IN ('New','Responded','Closed')),
    Tenant_ID INT NOT NULL,
    Property_ID INT NOT NULL,
    Agent_ID INT NOT NULL,
    FOREIGN KEY (Tenant_ID) REFERENCES TENANT(Tenant_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (Property_ID) REFERENCES PROPERTY(Property_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (Agent_ID) REFERENCES AGENT(Agent_ID) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE LEASE (
    Lease_ID INT AUTO_INCREMENT PRIMARY KEY,
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    Monthly_Rent DECIMAL(12,2) NOT NULL CHECK (Monthly_Rent > 0),
    Security_Deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
    Property_ID INT NOT NULL,
    Lease_Status ENUM('Pending_Payment','Active','Terminated','Expired') NOT NULL DEFAULT 'Pending_Payment',
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES PROPERTY(Property_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (End_Date > Start_Date)
);

CREATE TABLE TENANT_LEASE (
    Tenant_ID INT NOT NULL,
    Lease_ID INT NOT NULL,
    PRIMARY KEY (Tenant_ID, Lease_ID),
    FOREIGN KEY (Tenant_ID) REFERENCES TENANT(Tenant_ID) ON DELETE CASCADE,
    FOREIGN KEY (Lease_ID) REFERENCES LEASE(Lease_ID) ON DELETE CASCADE
);

--  PAYMENT TYPE ADDED AS PER FEEDBACK
CREATE TABLE PAYMENT (
    Payment_ID INT AUTO_INCREMENT PRIMARY KEY,
    Payment_Date DATE NOT NULL,
    Amount DECIMAL(12,2) NOT NULL CHECK (Amount > 0),
    Payment_Type ENUM('Security_Deposit','Monthly_Rent','Late_Fee','Sale_Payment','Other') NOT NULL DEFAULT 'Monthly_Rent',
    Method VARCHAR(50) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Success','Failed','Pending')),
    Lease_ID INT NOT NULL,
    FOREIGN KEY (Lease_ID) REFERENCES LEASE(Lease_ID) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE SALE (
    Sale_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Buyer_Tenant_ID INT NOT NULL,
    Amount DECIMAL(15,2) NOT NULL,
    Method VARCHAR(30) DEFAULT NULL,
    Sale_Status ENUM('Pending_Payment','Completed','Cancelled') NOT NULL DEFAULT 'Pending_Payment',
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES PROPERTY(Property_ID),
    FOREIGN KEY (Buyer_Tenant_ID) REFERENCES TENANT(Tenant_ID)
);

CREATE TABLE CUSTOMER_ANALYSIS (
    Tenant_ID INT PRIMARY KEY,
    HighValueFlag VARCHAR(10) DEFAULT 'No',
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Tenant_ID) REFERENCES TENANT(Tenant_ID) ON DELETE CASCADE
);

CREATE TABLE USERS (
    User_ID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(100) NOT NULL UNIQUE,
    Email VARCHAR(150) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    Role ENUM('tenant','owner','agent','admin') NOT NULL,
    Ref_ID INT NOT NULL,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE INQUIRY_AUDIT (
    Audit_ID INT AUTO_INCREMENT PRIMARY KEY,
    Inquiry_ID INT NOT NULL,
    Old_Status VARCHAR(20),
    New_Status VARCHAR(20),
    Changed_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Action VARCHAR(50)
);

-- --------------------------------------------------------
-- TRIGGERS
-- --------------------------------------------------------
DELIMITER $$

-- TRIGGER 1: PREVENT OVERLAPPING LEASES & LEASING SOLD PROPERTIES
CREATE TRIGGER trg_lease_before_insert
BEFORE INSERT ON LEASE
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_overlap_cnt INT DEFAULT 0;

    SELECT Status INTO v_status FROM PROPERTY WHERE Property_ID = NEW.Property_ID;

    IF v_status = 'Sold' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RIGOROUS METHOD: Cannot create lease: property is already Sold.';
    END IF;

    SELECT COUNT(*) INTO v_overlap_cnt FROM LEASE 
    WHERE Property_ID = NEW.Property_ID AND Lease_Status NOT IN ('Terminated', 'Expired') 
    AND Start_Date < NEW.End_Date AND End_Date > NEW.Start_Date;

    IF v_overlap_cnt > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RIGOROUS METHOD: Cannot create lease: active overlapping lease exists.';
    END IF;
END$$

-- TRIGGER 2: AUTO-UPDATE PROPERTY STATUS ON NEW LEASE
CREATE TRIGGER trg_lease_after_insert
AFTER INSERT ON LEASE
FOR EACH ROW
BEGIN
    IF NEW.Lease_Status = 'Active' THEN
        UPDATE PROPERTY SET Status = 'Rented' WHERE Property_ID = NEW.Property_ID;
    ELSEIF NEW.Lease_Status = 'Pending_Payment' THEN
        UPDATE PROPERTY SET Status = 'Pending' WHERE Property_ID = NEW.Property_ID;
    END IF;
END$$

-- TRIGGER 3: FREE UP PROPERTY IF LEASE IS DELETED
CREATE TRIGGER trg_lease_after_delete
AFTER DELETE ON LEASE
FOR EACH ROW
BEGIN
    DECLARE v_active_cnt INT DEFAULT 0;
    DECLARE v_status VARCHAR(20);

    SELECT Status INTO v_status FROM PROPERTY WHERE Property_ID = OLD.Property_ID;

    IF v_status != 'Sold' THEN
        SELECT COUNT(*) INTO v_active_cnt FROM LEASE WHERE Property_ID = OLD.Property_ID AND Lease_Status NOT IN ('Terminated', 'Expired');
        IF v_active_cnt = 0 THEN
            UPDATE PROPERTY SET Status = 'Available' WHERE Property_ID = OLD.Property_ID;
        END IF;
    END IF;
END$$

-- TRIGGER 4: FREE UP PROPERTY IF LEASE EXPIRES/TERMINATES
CREATE TRIGGER trg_lease_after_update
AFTER UPDATE ON LEASE
FOR EACH ROW
BEGIN
    DECLARE v_active_cnt INT DEFAULT 0;
    DECLARE v_status VARCHAR(20);

    -- If transitioning to Terminated/Expired
    IF NEW.Lease_Status IN ('Terminated', 'Expired') AND OLD.Lease_Status NOT IN ('Terminated', 'Expired') THEN
        SELECT Status INTO v_status FROM PROPERTY WHERE Property_ID = NEW.Property_ID;
        IF v_status != 'Sold' THEN
            SELECT COUNT(*) INTO v_active_cnt FROM LEASE WHERE Property_ID = NEW.Property_ID AND Lease_ID != NEW.Lease_ID AND Lease_Status NOT IN ('Terminated', 'Expired');
            IF v_active_cnt = 0 THEN
                UPDATE PROPERTY SET Status = 'Available' WHERE Property_ID = NEW.Property_ID;
            END IF;
        END IF;
    END IF;

    -- If a pending lease becomes active
    IF NEW.Lease_Status = 'Active' AND OLD.Lease_Status = 'Pending_Payment' THEN
        UPDATE PROPERTY SET Status = 'Rented' WHERE Property_ID = NEW.Property_ID;
    END IF;
END$$

-- TRIGGER 5: PREVENT INVALID PAYMENTS
CREATE TRIGGER trg_payment_before_insert
BEFORE INSERT ON PAYMENT
FOR EACH ROW
BEGIN
    DECLARE v_lease_status VARCHAR(30);
    SELECT Lease_Status INTO v_lease_status FROM LEASE WHERE Lease_ID = NEW.Lease_ID;

    IF v_lease_status IS NULL OR v_lease_status IN ('Terminated', 'Expired') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRST PRINCIPLES: Payment rejected. Lease is invalid or inactive.';
    END IF;
END$$

-- TRIGGER 6: ENSURE INQUIRY MATCHES PROPERTY AGENT (AUTO-CORRECT)
CREATE TRIGGER trg_inquiry_before_insert
BEFORE INSERT ON INQUIRY
FOR EACH ROW
BEGIN
    DECLARE v_property_agent INT;
    SELECT Agent_ID INTO v_property_agent FROM PROPERTY WHERE Property_ID = NEW.Property_ID;

    IF NEW.Agent_ID != v_property_agent THEN
        SET NEW.Agent_ID = v_property_agent;
    END IF;
END$$

-- TRIGGER 7: AUDIT LOG FOR INQUIRIES
CREATE TRIGGER trg_audit_inquiry_status
AFTER UPDATE ON INQUIRY
FOR EACH ROW
BEGIN
    IF OLD.Status != NEW.Status THEN
        INSERT INTO INQUIRY_AUDIT (Inquiry_ID, Old_Status, New_Status, Action)
        VALUES (OLD.Inquiry_ID, OLD.Status, NEW.Status, 'STATUS_UPDATE');
    END IF;
END$$

-- ============================================================
-- STORED PROCEDURES (PROPER SQL TRANSACTIONS & LOCKS)
-- ============================================================

-- Pehle standard delimiter use karke purane procedures hatao taaki Workbench confuse na ho
DELIMITER ;
DROP PROCEDURE IF EXISTS CreateLeaseTx;
DROP PROCEDURE IF EXISTS CreatePaymentTx;

-- Ab custom delimiter lagao naye procedures ke liye
DELIMITER $$

CREATE PROCEDURE CreateLeaseTx(
    IN p_Start_Date DATE,
    IN p_End_Date DATE,
    IN p_Monthly_Rent DECIMAL(12,2),
    IN p_Security_Deposit DECIMAL(12,2),
    IN p_Property_ID INT,
    IN p_Tenant_ID INT,
    OUT p_Status_Code INT,
    OUT p_Message VARCHAR(255),
    OUT p_New_Lease_ID INT
)
BEGIN
    DECLARE v_prop_status VARCHAR(20);
    
    -- AUTO-ROLLBACK ON ANY DB ERROR
    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        SET p_Status_Code = 500;
        SET p_Message = 'TRANSACTION FAILED: Database error, rolled back to maintain integrity.';
    END;

    -- START PROPER SQL TRANSACTION
    START TRANSACTION;

    -- EXCLUSIVE ROW LOCK: DOOSRA AGENT YAHAN WAIT KAREGA
    SELECT Status INTO v_prop_status 
    FROM PROPERTY 
    WHERE Property_ID = p_Property_ID 
    FOR UPDATE;

    -- CHECK CONFLICT
    IF v_prop_status IN ('Sold', 'Rented', 'Pending') THEN
        ROLLBACK;
        SET p_Status_Code = 409;
        SET p_Message = CONCAT('CONFLICT: Property is already ', v_prop_status, '. Transaction aborted.');
    ELSE
        -- INSERT DATA
        INSERT INTO LEASE (Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID, Lease_Status)
        VALUES (p_Start_Date, p_End_Date, p_Monthly_Rent, p_Security_Deposit, p_Property_ID, 'Pending_Payment');
        
        SET p_New_Lease_ID = LAST_INSERT_ID();
        
        IF p_Tenant_ID IS NOT NULL THEN
            INSERT INTO TENANT_LEASE (Tenant_ID, Lease_ID) VALUES (p_Tenant_ID, p_New_Lease_ID);
        END IF;

        -- COMMIT IF EVERYTHING IS FLAWLESS
        COMMIT;
        SET p_Status_Code = 201;
        SET p_Message = 'SUCCESS: Lease created and transaction committed safely.';
    END IF;
END$$

CREATE PROCEDURE CreatePaymentTx(
    IN p_Payment_Date DATE,
    IN p_Amount DECIMAL(12,2),
    IN p_Payment_Type VARCHAR(50),
    IN p_Method VARCHAR(50),
    IN p_Lease_ID INT,
    OUT p_Status_Code INT,
    OUT p_Message VARCHAR(255),
    OUT p_New_Payment_ID INT
)
BEGIN
    DECLARE v_lease_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION 
    BEGIN
        ROLLBACK;
        SET p_Status_Code = 500;
        SET p_Message = 'TRANSACTION FAILED: Database error, rolled back to maintain integrity.';
    END;

    START TRANSACTION;

    -- EXCLUSIVE ROW LOCK ON LEASE
    SELECT Lease_Status INTO v_lease_status 
    FROM LEASE 
    WHERE Lease_ID = p_Lease_ID 
    FOR UPDATE;

    IF v_lease_status IN ('Terminated', 'Expired') THEN
        ROLLBACK;
        SET p_Status_Code = 409;
        SET p_Message = 'CONFLICT: Cannot pay on a Terminated/Expired lease. Transaction aborted.';
    ELSE
        INSERT INTO PAYMENT (Payment_Date, Amount, Payment_Type, Method, Status, Lease_ID)
        VALUES (p_Payment_Date, p_Amount, p_Payment_Type, p_Method, 'Success', p_Lease_ID);
        
        SET p_New_Payment_ID = LAST_INSERT_ID();

        IF p_Payment_Type = 'Security_Deposit' AND v_lease_status = 'Pending_Payment' THEN
            UPDATE LEASE SET Lease_Status = 'Active' WHERE Lease_ID = p_Lease_ID;
        END IF;

        COMMIT;
        SET p_Status_Code = 201;
        SET p_Message = 'SUCCESS: Payment recorded and transaction committed.';
    END IF;
END$$

-- Wapas standard delimiter set kar do
DELIMITER ;