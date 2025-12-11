// English translations (base)
const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    loading: 'Loading...',
    noData: 'No data available',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    reset: 'Reset',
    clear: 'Clear',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    actions: 'Actions',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    required: 'Required',
    optional: 'Optional',
    total: 'Total',
    showing: 'Showing',
    of: 'of',
    page: 'Page',
    perPage: 'Per Page',
    sortBy: 'Sort By',
    ascending: 'Ascending',
    descending: 'Descending'
  },
  
  nav: {
    dashboard: 'Dashboard',
    customers: 'Customers',
    products: 'Products',
    bookings: 'Bookings',
    invoices: 'Invoices',
    calendar: 'Calendar',
    reports: 'Reports',
    notes: 'Notes',
    settings: 'Settings'
  },
  
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome to Xnoll Desktop',
    overview: 'Overview',
    todayBookings: 'Today\'s Bookings',
    upcomingBookings: 'Upcoming Bookings',
    recentCustomers: 'Recent Customers',
    revenue: 'Revenue',
    unpaidInvoices: 'Unpaid Invoices'
  },
  
  customers: {
    title: 'Customers',
    addNew: 'New Customer',
    editCustomer: 'Edit Customer',
    deleteConfirm: 'Are you sure you want to delete this customer?',
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    notes: 'Notes',
    createdAt: 'Created At',
    totalCustomers: 'Total Customers'
  },
  
  products: {
    title: 'Products / Services',
    addNew: 'New Product',
    editProduct: 'Edit Product',
    deleteConfirm: 'Are you sure you want to delete this product?',
    sku: 'SKU',
    name: 'Name',
    description: 'Description',
    price: 'Price',
    unit: 'Unit',
    category: 'Category',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock'
  },
  
  bookings: {
    title: 'Bookings',
    addNew: 'New Booking',
    editBooking: 'Edit Booking',
    deleteConfirm: 'Are you sure you want to delete this booking?',
    customer: 'Customer',
    service: 'Service',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    status: 'Status',
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    notes: 'Notes',
    generateInvoice: 'Generate Invoice'
  },
  
  invoices: {
    title: 'Invoices',
    addNew: 'New Invoice',
    editInvoice: 'Edit Invoice',
    deleteConfirm: 'Are you sure you want to delete this invoice?',
    invoiceNumber: 'Invoice Number',
    customer: 'Customer',
    date: 'Date',
    dueDate: 'Due Date',
    amount: 'Amount',
    paid: 'Paid',
    unpaid: 'Unpaid',
    partiallyPaid: 'Partially Paid',
    items: 'Items',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    total: 'Total',
    print: 'Print',
    download: 'Download'
  },
  
  calendar: {
    title: 'Calendar',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    today: 'Today',
    noBookings: 'No bookings for this period',
    createBooking: 'Create Booking'
  },
  
  reports: {
    title: 'Reports',
    salesReport: 'Sales Report',
    bookingStats: 'Booking Statistics',
    customerAnalytics: 'Customer Analytics',
    revenueReport: 'Revenue Report',
    dateRange: 'Date Range',
    from: 'From',
    to: 'To',
    generate: 'Generate Report',
    exportCSV: 'Export as CSV',
    exportPDF: 'Export as PDF'
  },
  
  notes: {
    title: 'Notes',
    addNew: 'New Note',
    editNote: 'Edit Note',
    deleteConfirm: 'Are you sure you want to delete this note?',
    noteTitle: 'Title',
    content: 'Content',
    tags: 'Tags',
    pinned: 'Pinned',
    color: 'Color',
    lastEdited: 'Last Edited'
  },
  
  settings: {
    title: 'Settings',
    general: 'General',
    company: 'Company Profile',
    language: 'Language',
    appearance: 'Appearance',
    customFields: 'Custom Fields',
    reminders: 'Reminders',
    backup: 'Backup & Restore',
    license: 'License',
    about: 'About',
    
    companyName: 'Company Name',
    companyLogo: 'Company Logo',
    companyAddress: 'Address',
    companyPhone: 'Phone',
    companyEmail: 'Email',
    taxId: 'Tax ID',
    currency: 'Currency',
    timezone: 'Timezone',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
    
    enableReminders: 'Enable Reminders',
    reminderTime: 'Reminder Time Before Appointment',
    soundNotification: 'Sound Notification',
    
    createBackup: 'Create Backup',
    restoreBackup: 'Restore from Backup',
    backupLocation: 'Backup Location',
    autoBackup: 'Automatic Backup',
    backupFrequency: 'Backup Frequency',
    
    licenseKey: 'License Key',
    activateLicense: 'Activate License',
    licenseStatus: 'License Status',
    licenseExpiry: 'License Expiry',
    
    autoGenerateSKU: 'Auto Generate SKU',
    skuPrefix: 'SKU Prefix',
    
    selectLanguage: 'Select Language',
    theme: 'Theme',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode'
  },
  
  customFields: {
    title: 'Custom Fields',
    addField: 'Add Custom Field',
    editField: 'Edit Custom Field',
    deleteConfirm: 'Are you sure you want to delete this custom field?',
    fieldName: 'Field Name',
    fieldLabel: 'Field Label',
    fieldType: 'Field Type',
    module: 'Module',
    isRequired: 'Required',
    displayInGrid: 'Display in Grid',
    displayInFilter: 'Display in Filter',
    isSortable: 'Sortable',
    isSearchable: 'Searchable',
    options: 'Options',
    defaultValue: 'Default Value',
    
    types: {
      text: 'Text',
      number: 'Number',
      email: 'Email',
      phone: 'Phone',
      url: 'URL',
      textarea: 'Text Area',
      date: 'Date',
      datetime: 'Date & Time',
      checkbox: 'Checkbox',
      checkboxGroup: 'Checkbox Group',
      radio: 'Radio',
      radioGroup: 'Radio Group',
      select: 'Select',
      multiSelect: 'Multi Select',
      file: 'File Upload'
    }
  },
  
  shortcuts: {
    title: 'Keyboard Shortcuts',
    global: 'Global',
    forms: 'Forms',
    navigation: 'Navigation',
    search: 'Search',
    
    ctrlK: 'Ctrl+K - Focus Search',
    ctrlS: 'Ctrl+S - Save Form',
    esc: 'ESC - Cancel / Close Modal',
    ctrlN: 'Ctrl+N - New Record',
    ctrlE: 'Ctrl+E - Edit Record',
    ctrlD: 'Ctrl+D - Delete Record',
    tab: 'Tab - Next Field',
    shiftTab: 'Shift+Tab - Previous Field',
    enter: 'Enter - Submit Form',
    ctrlP: 'Ctrl+P - Print',
    ctrlB: 'Ctrl+B - Create Backup'
  },
  
  errors: {
    required: 'This field is required',
    invalidEmail: 'Invalid email address',
    invalidPhone: 'Invalid phone number',
    invalidURL: 'Invalid URL',
    minLength: 'Minimum length is {{min}} characters',
    maxLength: 'Maximum length is {{max}} characters',
    minValue: 'Minimum value is {{min}}',
    maxValue: 'Maximum value is {{max}}',
    duplicate: 'This value already exists',
    saveFailed: 'Failed to save. Please try again.',
    deleteFailed: 'Failed to delete. Please try again.',
    loadFailed: 'Failed to load data. Please try again.',
    networkError: 'Network error. Please check your connection.',
    unknownError: 'An unknown error occurred.',
    invalidLicense: 'Invalid license key',
    licenseExpired: 'License has expired',
    backupFailed: 'Backup failed. Please try again.',
    restoreFailed: 'Restore failed. Please check the backup file.'
  },
  
  messages: {
    saveSuccess: 'Saved successfully',
    deleteSuccess: 'Deleted successfully',
    updateSuccess: 'Updated successfully',
    backupSuccess: 'Backup created successfully',
    restoreSuccess: 'Restore completed successfully',
    licenseActivated: 'License activated successfully',
    confirmDelete: 'Are you sure you want to delete this item?',
    unsavedChanges: 'You have unsaved changes. Do you want to leave?',
    noDataAvailable: 'No data available',
    selectCustomer: 'Please select a customer',
    selectProduct: 'Please select a product',
    selectDate: 'Please select a date'
  },
  
  license: {
    title: 'License Activation',
    enterKey: 'Enter your license key',
    activate: 'Activate',
    status: 'Status',
    activated: 'Activated',
    notActivated: 'Not Activated',
    expired: 'Expired',
    expiresOn: 'Expires on',
    machineId: 'Machine ID',
    contactSupport: 'Contact support for license issues',
    trialVersion: 'Trial Version',
    trialDaysLeft: '{{days}} days left in trial'
  }
};

// Hindi translations
const hi = {
  common: {
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    add: 'जोड़ें',
    search: 'खोजें',
    filter: 'फ़िल्टर',
    export: 'निर्यात',
    import: 'आयात',
    refresh: 'ताज़ा करें',
    loading: 'लोड हो रहा है...',
    noData: 'कोई डेटा उपलब्ध नहीं',
    confirm: 'पुष्टि करें',
    yes: 'हाँ',
    no: 'नहीं',
    close: 'बंद करें',
    back: 'वापस',
    next: 'अगला',
    previous: 'पिछला',
    submit: 'जमा करें',
    reset: 'रीसेट',
    clear: 'साफ़ करें'
  },
  
  nav: {
    dashboard: 'डैशबोर्ड',
    customers: 'ग्राहक',
    products: 'उत्पाद',
    bookings: 'बुकिंग',
    invoices: 'चालान',
    calendar: 'कैलेंडर',
    reports: 'रिपोर्ट',
    notes: 'नोट्स',
    settings: 'सेटिंग्स'
  },
  
  dashboard: {
    title: 'डैशबोर्ड',
    welcome: 'Xnoll Desktop में आपका स्वागत है',
    overview: 'अवलोकन'
  },
  
  customers: {
    title: 'ग्राहक',
    addNew: 'नया ग्राहक',
    name: 'नाम',
    phone: 'फ़ोन',
    email: 'ईमेल'
  },
  
  settings: {
    title: 'सेटिंग्स',
    language: 'भाषा',
    selectLanguage: 'भाषा चुनें'
  }
};

// Gujarati translations
const gu = {
  common: {
    save: 'સાચવો',
    cancel: 'રદ કરો',
    delete: 'કાઢી નાખો',
    edit: 'સંપાદિત કરો',
    add: 'ઉમેરો',
    search: 'શોધો'
  },
  
  nav: {
    dashboard: 'ડેશબોર્ડ',
    customers: 'ગ્રાહકો',
    products: 'ઉત્પાદનો',
    bookings: 'બુકિંગ',
    settings: 'સેટિંગ્સ'
  }
};

// Marathi translations
const mr = {
  common: {
    save: 'जतन करा',
    cancel: 'रद्द करा',
    delete: 'हटवा',
    edit: 'संपादित करा',
    add: 'जोडा',
    search: 'शोधा'
  },
  
  nav: {
    dashboard: 'डॅशबोर्ड',
    customers: 'ग्राहक',
    products: 'उत्पादने',
    bookings: 'बुकिंग',
    settings: 'सेटिंग्ज'
  }
};

// Tamil translations
const ta = {
  common: {
    save: 'சேமி',
    cancel: 'ரத்து செய்',
    delete: 'அழி',
    edit: 'திருத்து',
    add: 'சேர்',
    search: 'தேடு'
  },
  
  nav: {
    dashboard: 'முகப்பு',
    customers: 'வாடிக்கையாளர்கள்',
    products: 'தயாரிப்புகள்',
    bookings: 'பதிவுகள்',
    settings: 'அமைப்புகள்'
  }
};

// Telugu translations
const te = {
  common: {
    save: 'సేవ్ చేయండి',
    cancel: 'రద్దు చేయండి',
    delete: 'తొలగించు',
    edit: 'సవరించు',
    add: 'జోడించు',
    search: 'వెతకండి'
  },
  
  nav: {
    dashboard: 'డాష్‌బోర్డ్',
    customers: 'కస్టమర్లు',
    products: 'ఉత్పత్తులు',
    bookings: 'బుకింగ్‌లు',
    settings: 'సెట్టింగులు'
  }
};

const translations = {
  en,
  hi,
  gu,
  mr,
  ta,
  te
};

export default translations;