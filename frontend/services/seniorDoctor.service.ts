export interface SeniorDoctorProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  consultationRoom: string;
}

export const SeniorDoctorService = {
  login: async (employeeId: string, passcode: string): Promise<SeniorDoctorProfile> => {
    await new Promise((resolve) => setTimeout(resolve, 600)); // Simulate clinical API network delay

    // Allow SD-1001 or any credentials for testing
    if (employeeId.trim() && passcode.trim()) {
      return {
        id: employeeId,
        name: "Dr. Alok Verma",
        role: "Senior Consultant Otologist",
        department: "Otolaryngology & Skull Base Surgery",
        consultationRoom: "Room 404 (ENT Suite)",
      };
    }

    throw new Error("Invalid Senior Doctor credentials or passcode.");
  },
};
