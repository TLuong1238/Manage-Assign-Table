/**
 * ✅ Time utilities for bill management
 */

const TimeUtils = {
  /**
   * Calculate time status for booking
   * @param {string} timeString - ISO time string or Date string
   * @returns {object} Status object with text, color, and status
   */
  calculateTimeStatus: (timeString) => {
    if (!timeString) {
      return {
        status: 'invalid',
        text: 'Thời gian không hợp lệ',
        color: '#95a5a6'
      };
    }

    const bookingTime = new Date(timeString);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(bookingTime.getTime())) {
      return {
        status: 'invalid',
        text: 'Thời gian không hợp lệ',
        color: '#95a5a6'
      };
    }

    const diffMilliseconds = bookingTime - now;
    const diffMinutes = Math.floor(diffMilliseconds / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Past time (expired)
    if (diffMinutes < 0) {
      const pastMinutes = Math.abs(diffMinutes);
      if (pastMinutes < 60) {
        return {
          status: 'expired',
          text: `Đã quá ${pastMinutes} phút`,
          color: '#e74c3c'
        };
      } else if (pastMinutes < 1440) { // Less than 24 hours
        const pastHours = Math.floor(pastMinutes / 60);
        return {
          status: 'expired',
          text: `Đã quá ${pastHours} giờ`,
          color: '#e74c3c'
        };
      } else {
        const pastDays = Math.floor(pastMinutes / 1440);
        return {
          status: 'expired',
          text: `Đã quá ${pastDays} ngày`,
          color: '#e74c3c'
        };
      }
    }

    // Future time
    if (diffMinutes <= 15) {
      return {
        status: 'critical',
        text: `Còn ${diffMinutes} phút`,
        color: '#e74c3c'
      };
    } else if (diffMinutes <= 30) {
      return {
        status: 'urgent',
        text: `Còn ${diffMinutes} phút`,
        color: '#f39c12'
      };
    } else if (diffMinutes <= 60) {
      return {
        status: 'warning',
        text: `Còn ${diffMinutes} phút`,
        color: '#f1c40f'
      };
    } else if (diffHours < 24) {
      return {
        status: 'normal',
        text: `Còn ${diffHours} giờ ${diffMinutes % 60} phút`,
        color: '#27ae60'
      };
    } else {
      return {
        status: 'scheduled',
        text: `Còn ${diffDays} ngày`,
        color: '#3498db'
      };
    }
  },

  /**
   * Format time to Vietnamese locale
   * @param {string|Date} timeString 
   * @returns {string} Formatted time string
   */
  formatToVietnamese: (timeString) => {
    if (!timeString) return 'Không xác định';
    
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return 'Thời gian không hợp lệ';
      
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
    } catch (error) {
      console.error('formatToVietnamese error:', error);
      return 'Lỗi định dạng thời gian';
    }
  },

  /**
   * Format time to short Vietnamese format
   * @param {string|Date} timeString 
   * @returns {string} Short formatted time
   */
  formatShort: (timeString) => {
    if (!timeString) return '--:--';
    
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return '--:--';
      
      return date.toLocaleString('vi-VN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
    } catch (error) {
      console.error('formatShort error:', error);
      return '--:--';
    }
  },

  /**
   * Get time difference in human readable format
   * @param {string|Date} startTime 
   * @param {string|Date} endTime 
   * @returns {string} Human readable difference
   */
  getTimeDifference: (startTime, endTime = new Date()) => {
    if (!startTime) return 'Không xác định';
    
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Thời gian không hợp lệ';
      }
      
      const diffMilliseconds = Math.abs(end - start);
      const diffMinutes = Math.floor(diffMilliseconds / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMinutes < 1) {
        return 'Vừa xong';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} phút`;
      } else if (diffHours < 24) {
        return `${diffHours} giờ`;
      } else {
        return `${diffDays} ngày`;
      }
    } catch (error) {
      console.error('getTimeDifference error:', error);
      return 'Lỗi tính toán thời gian';
    }
  },

  /**
   * Check if time is today
   * @param {string|Date} timeString 
   * @returns {boolean}
   */
  isToday: (timeString) => {
    if (!timeString) return false;
    
    try {
      const date = new Date(timeString);
      const today = new Date();
      
      return date.toDateString() === today.toDateString();
    } catch (error) {
      console.error('isToday error:', error);
      return false;
    }
  },

  /**
   * Check if time is in the past
   * @param {string|Date} timeString 
   * @returns {boolean}
   */
  isPast: (timeString) => {
    if (!timeString) return false;
    
    try {
      const date = new Date(timeString);
      const now = new Date();
      
      return date < now;
    } catch (error) {
      console.error('isPast error:', error);
      return false;
    }
  },

  /**
   * Get status color based on time
   * @param {string} status - Status from calculateTimeStatus
   * @returns {string} Color hex code
   */
  getStatusColor: (status) => {
    const colors = {
      'critical': '#e74c3c',
      'urgent': '#f39c12', 
      'warning': '#f1c40f',
      'normal': '#27ae60',
      'scheduled': '#3498db',
      'expired': '#e74c3c',
      'invalid': '#95a5a6'
    };
    
    return colors[status] || '#95a5a6';
  },

  /**
   * Get current Vietnam time
   * @returns {Date} Current time in Vietnam timezone
   */
  getVietnamTime: () => {
    return new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh'
    });
  },

  /**
   * Check if booking time is valid (not too far in past/future)
   * @param {string|Date} timeString 
   * @returns {object} Validation result
   */
  validateBookingTime: (timeString) => {
    if (!timeString) {
      return {
        isValid: false,
        message: 'Thời gian không được để trống'
      };
    }

    try {
      const bookingTime = new Date(timeString);
      const now = new Date();
      
      if (isNaN(bookingTime.getTime())) {
        return {
          isValid: false,
          message: 'Thời gian không hợp lệ'
        };
      }

      // Check if too far in the past (more than 1 day)
      const pastLimit = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      if (bookingTime < pastLimit) {
        return {
          isValid: false,
          message: 'Thời gian đặt không thể quá 1 ngày trong quá khứ'
        };
      }

      // Check if too far in the future (more than 30 days)
      const futureLimit = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      if (bookingTime > futureLimit) {
        return {
          isValid: false,
          message: 'Thời gian đặt không thể quá 30 ngày trong tương lai'
        };
      }

      return {
        isValid: true,
        message: 'Thời gian hợp lệ'
      };
    } catch (error) {
      console.error('validateBookingTime error:', error);
      return {
        isValid: false,
        message: 'Lỗi kiểm tra thời gian'
      };
    }
  }
};

export default TimeUtils;