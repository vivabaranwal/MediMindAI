export interface JuniorDoctorProfile {
  id: string;
  name: string;
  role: string;
  department: string;
}

export const JuniorDoctorService = {
  login: async (employeeId: string, passcode: string): Promise<JuniorDoctorProfile> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    // We allow JD-9021 as the default employee, but also accept any credentials for testing
    if (employeeId.trim() && passcode.trim()) {
      return {
        id: employeeId,
        name: "Dr. Amit Pathak",
        role: "Junior Resident",
        department: "ENT & Otology Area",
      };
    }
    
    throw new Error("Invalid Employee ID or Passcode");
  },
};
