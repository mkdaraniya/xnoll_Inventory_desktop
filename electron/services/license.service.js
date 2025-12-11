// electron/services/license.service.js
const crypto = require('crypto');
const os = require('os');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class LicenseService {
  constructor() {
    this.licenseFile = path.join(app.getPath('userData'), 'license.dat');
    this.secretKey = 'XNOLL_SECRET_KEY_2024'; // In production, use environment variable
  }

  /**
   * Generate unique machine ID based on CPU and network interfaces
   */
  getMachineId() {
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();
    
    // Get CPU model
    const cpuModel = cpus[0]?.model || 'unknown';
    
    // Get MAC addresses
    const macs = [];
    Object.values(networkInterfaces).forEach(interfaces => {
      interfaces.forEach(iface => {
        if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macs.push(iface.mac);
        }
      });
    });
    
    const uniqueString = `${cpuModel}-${macs.sort().join('-')}-${os.hostname()}`;
    
    // Hash the unique string
    return crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 32);
  }

  /**
   * Validate license key format and signature
   */
  validateLicenseFormat(licenseKey) {
    // License format: XXXX-XXXX-XXXX-XXXX-XXXX (20 characters + 4 dashes)
    const regex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return regex.test(licenseKey);
  }

  /**
   * Verify license key against machine ID
   */
  verifyLicense(licenseKey, machineId) {
    if (!this.validateLicenseFormat(licenseKey)) {
      return { valid: false, error: 'Invalid license format' };
    }

    try {
      // Decode license key
      const parts = licenseKey.split('-');
      const encodedData = parts.slice(0, 4).join('');
      
      // Verify checksum (last part)
      const checksum = parts[4];
      const calculatedChecksum = this.calculateChecksum(encodedData + machineId);
      
      if (checksum !== calculatedChecksum) {
        return { valid: false, error: 'Invalid license key' };
      }

      // Decode expiry date (embedded in first 8 chars)
      const expiryTimestamp = parseInt(encodedData.substring(0, 8), 36);
      const expiryDate = new Date(expiryTimestamp * 1000);
      const now = new Date();

      if (expiryDate < now) {
        return { valid: false, error: 'License expired', expiryDate };
      }

      return { 
        valid: true, 
        expiryDate,
        daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
      };
    } catch (error) {
      return { valid: false, error: 'Invalid license key' };
    }
  }

  /**
   * Calculate checksum for license validation
   */
  calculateChecksum(data) {
    const hash = crypto.createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
    return hash.substring(0, 4).toUpperCase();
  }

  /**
   * Save license to file (encrypted)
   */
  saveLicense(licenseKey) {
    try {
      const machineId = this.getMachineId();
      const verification = this.verifyLicense(licenseKey, machineId);

      if (!verification.valid) {
        return { success: false, error: verification.error };
      }

      const licenseData = {
        key: licenseKey,
        machineId,
        activatedAt: new Date().toISOString(),
        expiryDate: verification.expiryDate.toISOString()
      };

      // Encrypt and save
      const encrypted = this.encrypt(JSON.stringify(licenseData));
      fs.writeFileSync(this.licenseFile, encrypted, 'utf8');

      return { 
        success: true, 
        expiryDate: verification.expiryDate,
        daysRemaining: verification.daysRemaining
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Load and verify saved license
   */
  loadLicense() {
    try {
      if (!fs.existsSync(this.licenseFile)) {
        return { valid: false, error: 'No license found' };
      }

      const encrypted = fs.readFileSync(this.licenseFile, 'utf8');
      const decrypted = this.decrypt(encrypted);
      const licenseData = JSON.parse(decrypted);

      // Verify machine ID matches
      const currentMachineId = this.getMachineId();
      if (licenseData.machineId !== currentMachineId) {
        return { valid: false, error: 'License is for different machine' };
      }

      // Verify license key
      const verification = this.verifyLicense(licenseData.key, currentMachineId);
      
      if (!verification.valid) {
        return verification;
      }

      return {
        valid: true,
        licenseKey: licenseData.key,
        activatedAt: licenseData.activatedAt,
        expiryDate: verification.expiryDate,
        daysRemaining: verification.daysRemaining
      };
    } catch (error) {
      return { valid: false, error: 'Failed to load license' };
    }
  }

  /**
   * Encrypt data
   */
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data
   */
  decrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.secretKey, 'salt', 32);
    
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Remove license (deactivate)
   */
  removeLicense() {
    try {
      if (fs.existsSync(this.licenseFile)) {
        fs.unlinkSync(this.licenseFile);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate license key (for license server/admin tool)
   * This should NOT be in the client app in production!
   * Shown here for demonstration only.
   */
  static generateLicenseKey(machineId, expiryDate) {
    const secretKey = 'XNOLL_SECRET_KEY_2024';
    
    // Convert expiry date to timestamp (in seconds)
    const timestamp = Math.floor(expiryDate.getTime() / 1000);
    
    // Encode timestamp in base36 (8 chars)
    const encodedTimestamp = timestamp.toString(36).padStart(8, '0').toUpperCase();
    
    // Generate random padding (8 chars)
    const padding = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    const encodedData = encodedTimestamp + padding;
    
    // Calculate checksum
    const hash = crypto.createHmac('sha256', secretKey)
      .update(encodedData + machineId)
      .digest('hex');
    const checksum = hash.substring(0, 4).toUpperCase();
    
    // Format as XXXX-XXXX-XXXX-XXXX-XXXX
    const licenseKey = encodedData.match(/.{1,4}/g).join('-') + '-' + checksum;
    
    return licenseKey;
  }
}

module.exports = new LicenseService();