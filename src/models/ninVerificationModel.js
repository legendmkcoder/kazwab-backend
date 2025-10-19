const mongoose = require("mongoose");

const ninVerificationSchema = new mongoose.Schema(
  {
    nin: {
      type: String,
      required: true,
      unique: true,
      length: 11,
    },
    // Basic info from NIN (non-editable)
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    // Additional NIN data
    transactionID: {
      type: String,
      default: "",
    },
    documentNumber: {
      type: String,
      default: "",
    },
    birthCountry: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    uin: {
      type: String,
      default: "",
    },
    religion: {
      type: String,
      default: "",
    },
    nokLga: {
      type: String,
      default: "",
    },
    birthLga: {
      type: String,
      default: "",
    },
    lga: {
      type: String,
      default: "",
    },
    birthState: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    educationalLevel: {
      type: String,
      default: "",
    },
    employmentStatus: {
      type: String,
      default: "",
    },
    maidenName: {
      type: String,
      default: "",
    },
    maritalStatus: {
      type: String,
      default: "",
    },
    nokAddress1: {
      type: String,
      default: "",
    },
    nokAddress2: {
      type: String,
      default: "",
    },
    nokState: {
      type: String,
      default: "",
    },
    nokFirstName: {
      type: String,
      default: "",
    },
    nokMiddleName: {
      type: String,
      default: "",
    },
    nokLastName: {
      type: String,
      default: "",
    },
    nokTown: {
      type: String,
      default: "",
    },
    nativeLanguage: {
      type: String,
      default: "",
    },
    otherLanguage: {
      type: String,
      default: "",
    },
    photo: {
      type: String,
      default: "",
    },
    profession: {
      type: String,
      default: "",
    },
    residenceAddressLine1: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    residenceAddressLine2: {
      type: String,
      default: "",
    },
    residenceTown: {
      type: String,
      default: "",
    },
    residenceLga: {
      type: String,
      default: "",
    },
    residencePostalCode: {
      type: String,
      default: "",
    },
    residenceState: {
      type: String,
      default: "",
    },
    residenceStatus: {
      type: String,
      default: "",
    },
    selfOriginLga: {
      type: String,
      default: "",
    },
    selfOriginPlace: {
      type: String,
      default: "",
    },
    selfOriginState: {
      type: String,
      default: "",
    },
    otherName: {
      type: String,
      default: "",
    },
    height: {
      type: String,
      default: "",
    },
    previousFirstName: {
      type: String,
      default: "",
    },
    previousLastName: {
      type: String,
      default: "",
    },
    previousMiddleName: {
      type: String,
      default: "",
    },
    signature: {
      type: String,
      default: "",
    },
    cardstatus: {
      type: String,
      default: "",
    },
    postalCode: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    lastname: {
      type: String,
      default: "",
    },
    firstname: {
      type: String,
      default: "",
    },
    surname: {
      type: String,
      default: "",
    },
    verificationId: {
      type: String,
      default: "",
    },
    fromCache: {
      type: Boolean,
      default: false,
    },
    // API response metadata
    apiResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
ninVerificationSchema.index({ nin: 1 });
ninVerificationSchema.index({ verifiedAt: 1 });

module.exports = mongoose.model("NINVerification", ninVerificationSchema);
