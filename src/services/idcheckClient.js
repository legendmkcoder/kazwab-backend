const axios = require('axios');
const NINVerification = require('../models/ninVerificationModel');
const logger = require('../utils/logger');

class IDCheckClient {
  constructor() {
    this.baseURL = process.env.IDCHECK_BASE_URL;
    this.apiKey = process.env.IDCHECK_API_KEY;
  }

  /**
   * Verify NIN with IDCheck API
   * First checks local cache, then calls API if not found
   * @param {string} nin - 11-digit NIN number
   * @returns {Object} NIN verification data
   */
  async verifyNIN(nin) {
    try {
      // Validate NIN format
      if (!nin || nin.length !== 11 || !/^\d{11}$/.test(nin)) {
        throw {
          statusCode: 400,
          message: 'Invalid NIN format. NIN must be 11 digits.',
        };
      }

      // Check if NIN is already cached
      let cachedNIN = await NINVerification.findOne({ nin });

      if (cachedNIN) {
        logger.info(`NIN verification successful (from cache) for: ${nin}`);
        // Return cached data
        return {
          success: true,
          message: 'NIN verification successful (from cache)',
          data: this.formatNINData(cachedNIN),
          fromCache: true,
        };
      }

      // Call IDCheck API
      const apiResponse = await this.callIDCheckAPI(nin);

      if (!apiResponse.success) {
        throw {
          statusCode: 400,
          message: apiResponse.message || 'NIN verification failed',
        };
      }

      // Cache the API response
      const ninData = await this.cacheNINData(nin, apiResponse.data);

      logger.info(`NIN verification successful (from API) for: ${nin}`);
      return {
        success: true,
        message: 'NIN verification successful',
        data: this.formatNINData(ninData),
        fromCache: false,
      };
    } catch (error) {
      logger.error('NIN verification error:', error);

      if (error.statusCode) {
        throw error;
      }

      throw {
        statusCode: 500,
        message: 'NIN verification service unavailable',
      };
    }
  }

  /**
   * Call IDCheck API directly
   * @param {string} nin - 11-digit NIN number
   * @returns {Object} API response
   */
  async callIDCheckAPI(nin) {
    try {
      const response = await axios.post(
        `https://devapi.idcheck.ng/v1/rest-api/verification/nin`,
        { nin },
        {
          headers: {
            apiKey: this.apiKey || 'pk_live_90f1fde1785',
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      return response.data;
    } catch (error) {
      logger.error('IDCheck API Error:', error.response?.data || error.message);

      if (error.response?.status === 404) {
        throw {
          statusCode: 404,
          message: 'NIN not found in database',
        };
      } else if (error.response?.status === 400) {
        throw {
          statusCode: 400,
          message: 'Invalid NIN provided',
        };
      } else if (error.code === 'ECONNABORTED') {
        throw {
          statusCode: 408,
          message: 'NIN verification service timeout',
        };
      } else {
        throw {
          statusCode: 500,
          message: 'NIN verification service error',
        };
      }
    }
  }

  /**
   * Cache NIN data in database
   * @param {string} nin - NIN number
   * @param {Object} apiData - Data from IDCheck API
   * @returns {Object} Cached NIN data
   */
  async cacheNINData(nin, apiData) {
    try {
      const ninData = new NINVerification({
        nin,
        firstName: apiData.firstName || '',
        lastName: apiData.lastName || '',
        middleName: apiData.middleName || '',
        dateOfBirth: apiData.dateOfBirth ? new Date(apiData.dateOfBirth) : null,
        gender: apiData.gender || '',
        phoneNumber: apiData.phoneNumber || apiData.telephoneNo || '',
        email: apiData.email || '',
        transactionID: apiData.transactionID || '',
        documentNumber: apiData.documentNumber || '',
        birthCountry: apiData.birthCountry || '',
        country: apiData.country || '',
        uin: apiData.uin || '',
        religion: apiData.religion || '',
        nokLga: apiData.nokLga || '',
        birthLga: apiData.birthLga || '',
        lga: apiData.lga || '',
        birthState: apiData.birthState || '',
        state: apiData.state || '',
        educationalLevel: apiData.educationalLevel || '',
        employmentStatus: apiData.employmentStatus || '',
        maidenName: apiData.maidenName || '',
        maritalStatus: apiData.maritalStatus || '',
        nokAddress1: apiData.nokAddress1 || '',
        nokAddress2: apiData.nokAddress2 || '',
        nokState: apiData.nokState || '',
        nokFirstName: apiData.nokFirstName || '',
        nokMiddleName: apiData.nokMiddleName || '',
        nokLastName: apiData.nokLastName || '',
        nokTown: apiData.nokTown || '',
        nativeLanguage: apiData.nativeLanguage || '',
        otherLanguage: apiData.otherLanguage || '',
        photo: apiData.photo || '',
        profession: apiData.profession || '',
        residenceAddressLine1: apiData.residenceAddressLine1 || '',
        address: apiData.address || '',
        residenceAddressLine2: apiData.residenceAddressLine2 || '',
        residenceTown: apiData.residenceTown || '',
        residenceLga: apiData.residenceLga || '',
        residencePostalCode: apiData.residencePostalCode || '',
        residenceState: apiData.residenceState || '',
        residenceStatus: apiData.residenceStatus || '',
        selfOriginLga: apiData.selfOriginLga || '',
        selfOriginPlace: apiData.selfOriginPlace || '',
        selfOriginState: apiData.selfOriginState || '',
        otherName: apiData.otherName || '',
        height: apiData.height || '',
        previousFirstName: apiData.previousFirstName || '',
        previousLastName: apiData.previousLastName || '',
        previousMiddleName: apiData.previousMiddleName || '',
        signature: apiData.signature || '',
        cardstatus: apiData.cardstatus || '',
        postalCode: apiData.postalCode || '',
        title: apiData.title || '',
        lastname: apiData.lastname || '',
        firstname: apiData.firstname || '',
        surname: apiData.surname || '',
        verificationId: apiData.verificationId || '',
        fromCache: false,
        apiResponse: apiData,
      });

      await ninData.save();
      logger.info(`NIN data cached successfully for: ${nin}`);
      return ninData;
    } catch (error) {
      logger.error('Error caching NIN data:', error);
      throw {
        statusCode: 500,
        message: 'Failed to cache NIN data',
      };
    }
  }

  /**
   * Format NIN data for API response
   * @param {Object} ninData - NIN data from database
   * @returns {Object} Formatted NIN data
   */
  formatNINData(ninData) {
    return {
      id: ninData._id,
      nin: ninData.nin,
      firstName: ninData.firstName,
      lastName: ninData.lastName,
      middleName: ninData.middleName,
      dateOfBirth: ninData.dateOfBirth,
      gender: ninData.gender,
      phoneNumber: ninData.phoneNumber,
      email: ninData.email,
      address: ninData.address,
      residenceAddressLine1: ninData.residenceAddressLine1,
      residenceAddressLine2: ninData.residenceAddressLine2,
      residenceTown: ninData.residenceTown,
      residenceLga: ninData.residenceLga,
      residenceState: ninData.residenceState,
      residencePostalCode: ninData.residencePostalCode,
      state: ninData.state,
      lga: ninData.lga,
      birthState: ninData.birthState,
      birthLga: ninData.birthLga,
      photo: ninData.photo,
      signature: ninData.signature,
      verificationId: ninData.verificationId,
      verifiedAt: ninData.verifiedAt,
    };
  }

  /**
   * Clear NIN cache (admin function)
   * @param {string} nin - NIN to clear from cache
   * @returns {boolean} Success status
   */
  async clearNINCache(nin) {
    try {
      const result = await NINVerification.deleteOne({ nin });
      logger.info(`NIN cache cleared for: ${nin}`);
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error clearing NIN cache:', error);
      throw {
        statusCode: 500,
        message: 'Failed to clear NIN cache',
      };
    }
  }

  /**
   * Get cached NIN statistics
   * @returns {Object} Cache statistics
   */
  async getCacheStats() {
    try {
      const total = await NINVerification.countDocuments();
      const recent = await NINVerification.countDocuments({
        verifiedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      });

      return {
        totalCached: total,
        recentVerifications: recent,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      throw {
        statusCode: 500,
        message: 'Failed to get cache statistics',
      };
    }
  }
}

module.exports = new IDCheckClient();
