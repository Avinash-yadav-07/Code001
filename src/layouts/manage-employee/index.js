import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  Typography,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import DataTable from "examples/Tables/DataTable";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { db, auth, firebaseConfig } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useMaterialUIController } from "context";
import * as XLSX from "xlsx";

// Initialize secondary Firebase app
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

const departments = ["HR", "Engineering", "Marketing", "Sales", "Finance"];
const statuses = ["Active", "On Leave", "Resigned", "Terminated"];
const roles = [
  "ManageProject:read",
  "ManageProject:full access",
  "ManageAccount:read",
  "ManageAccount:full access",
  "ManageExpense:read",
  "ManageExpense:full access",
  "ManageEarning:read",
  "ManageEarning:full access",
  "ManageClient:read",
  "ManageClient:full access",
  "ManageMarketing:full access",
  "ManageSales:full access",
  "ManageCustomer:raed",
  "ManageCustomer:full access",
];

// Generate unique employee ID
const generateEmployeeId = (name) => {
  const prefix = name.substring(0, 3).toUpperCase();
  const randomNumber = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${randomNumber}`;
};

// Check if an ID is unique in Firestore
const checkUniqueId = async (
  collectionName,
  field,
  value,
  excludeDocId = null
) => {
  try {
    const q = query(collection(db, collectionName), where(field, "==", value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.every((doc) => doc.id !== excludeDocId);
  } catch (error) {
    console.error(`Error checking unique ${field}:`, error);
    return false;
  }
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const ManageEmployee = () => {
  const [open, setOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [excelOption, setExcelOption] = useState("");
  const [errors, setErrors] = useState({});

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);

  // Dark mode state
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  // Fetch user roles from Firestore "users" collection
  useEffect(() => {
    const fetchUserRoles = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(
            collection(db, "users"),
            where("email", "==", user.email)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0].data();
            setUserRoles(userDoc.roles || []);
          } else {
            console.error("User not found in Firestore");
            setUserRoles([]);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setUserRoles([]);
        }
      } else {
        setUserRoles([]);
      }
      setLoadingRoles(false);
    };

    fetchUserRoles();
  }, []);

  const isReadOnly =
    userRoles.includes("ManageEmployee:read") &&
    !userRoles.includes("ManageEmployee:full access");
  const hasAccess =
    userRoles.includes("ManageEmployee:read") ||
    userRoles.includes("ManageEmployee:full access");

  // Fetch employees
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchError(null);
        const employeesSnapshot = await getDocs(collection(db, "employees"));
        const employeesData = employeesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmployees(employeesData);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setFetchError("Failed to fetch employees. Please try again.");
      }
    };

    if (!loadingRoles) {
      fetchData();
    }
  }, [loadingRoles]);

  // Filter and search employees
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      searchQuery === "" ||
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.designation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === "" ||
      (filterType === "Department" && employee.department === filterValue) ||
      (filterType === "Status" && employee.status === filterValue);

    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Employee Component
  const Employee = ({ name, employeeId, email }) => (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
      <MDBox ml={0} lineHeight={1.2}>
        <MDTypography display="block" variant="button" fontWeight="medium">
          {name}
        </MDTypography>
        <MDTypography variant="caption" display="block">
          ID: {employeeId}
        </MDTypography>
        <MDTypography variant="caption" display="block">
          Mail: {email}
        </MDTypography>
      </MDBox>
    </MDBox>
  );

  Employee.propTypes = {
    name: PropTypes.string.isRequired,
    employeeId: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  };

  // DesignationDept Component
  const DesignationDept = ({ designation, department }) => (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography
        display="block"
        variant="caption"
        color="text"
        fontWeight="medium"
      >
        {designation}
      </MDTypography>
      <MDTypography variant="caption">{department}</MDTypography>
    </MDBox>
  );

  DesignationDept.propTypes = {
    designation: PropTypes.string.isRequired,
    department: PropTypes.string.isRequired,
  };

  // StatusBadge Component
  const StatusBadge = ({ status }) => {
    const colorMap = {
      Active: "success",
      "On Leave": "warning",
      Resigned: "error",
      Terminated: "dark",
    };
    return (
      <MDBox ml={-1}>
        <MDBadge
          badgeContent={status}
          color={colorMap[status] || "dark"}
          variant="gradient"
          size="sm"
        />
      </MDBox>
    );
  };

  StatusBadge.propTypes = {
    status: PropTypes.string.isRequired,
  };

  // Handle Excel option change
  const handleExcelOptionChange = (event) => {
    const option = event.target.value;
    setExcelOption(option);

    if (option === "upload") {
      document.getElementById("file-upload").click();
    } else if (option === "download") {
      handleDownloadExcel();
    } else if (option === "downloadDummy") {
      handleDownloadDummyExcel();
    }

    setExcelOption("");
  };

  // Handle Excel file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          blankrows: false,
        });

        const validRoles = roles.map((r) => r.toLowerCase());

        // Normalize column names for Excel import
        const normalizeColumnName = (name) => {
          if (!name) return "";
          const cleanName = name.trim().toLowerCase().replace(/\s+/g, "");
          if (cleanName.includes("name")) return "Name";
          if (cleanName.includes("email")) return "Email";
          if (cleanName.includes("phone")) return "Phone";
          if (cleanName.includes("department")) return "Department";
          if (cleanName.includes("designation")) return "Designation";
          if (
            cleanName.includes("joiningdate") ||
            cleanName.includes("joining")
          )
            return "Joining Date";
          if (cleanName.includes("exitdate") || cleanName.includes("exit"))
            return "Exit Date";
          if (cleanName.includes("salary")) return "Salary";
          if (cleanName.includes("status")) return "Status";
          if (cleanName.includes("roles")) return "Roles";
          return name;
        };

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeColumnName(key)] = row[key];
          });
          return normalizedRow;
        });

        for (const employee of normalizedData) {
          // Validate required fields
          if (
            !employee["Name"]?.trim() ||
            !employee["Email"]?.trim() ||
            !employee["Department"]?.trim() ||
            !employee["Designation"]?.trim() ||
            !employee["Joining Date"]?.trim() ||
            !employee["Status"]?.trim()
          ) {
            console.error(
              "Missing required fields in employee:",
              employee["Name"]
            );
            alert(
              `Missing required fields for employee ${
                employee["Name"] || "unknown"
              }. Required: Name, Email, Department, Designation, Joining Date, Status.`
            );
            return;
          }

          // Validate email format
          if (!isValidEmail(employee["Email"])) {
            console.error(
              "Invalid email format for employee:",
              employee["Name"]
            );
            alert(
              `Invalid email format "${employee["Email"]}" for employee ${employee["Name"]}.`
            );
            return;
          }

          // Validate department
          const normalizedDepartment = employee["Department"].trim();
          if (
            !departments
              .map((d) => d.toLowerCase())
              .includes(normalizedDepartment.toLowerCase())
          ) {
            console.error("Invalid department for employee:", employee["Name"]);
            alert(
              `Invalid department "${employee["Department"]}" for employee ${employee["Name"]}.`
            );
            return;
          }

          // Validate status
          const normalizedStatus = employee["Status"].trim();
          if (
            !statuses
              .map((s) => s.toLowerCase())
              .includes(normalizedStatus.toLowerCase())
          ) {
            console.error("Invalid status for employee:", employee["Name"]);
            alert(
              `Invalid status "${employee["Status"]}" for employee ${employee["Name"]}.`
            );
            return;
          }

          // Validate joining date format (YYYY-MM-DD)
          const joiningDateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!joiningDateRegex.test(employee["Joining Date"])) {
            console.error(
              "Invalid joining date format for employee:",
              employee["Name"]
            );
            alert(
              `Invalid joining date format "${employee["Joining Date"]}" for employee ${employee["Name"]}. Use YYYY-MM-DD.`
            );
            return;
          }

          // Validate exit date format if provided
          if (
            employee["Exit Date"] &&
            !joiningDateRegex.test(employee["Exit Date"])
          ) {
            console.error(
              "Invalid exit date format for employee:",
              employee["Name"]
            );
            alert(
              `Invalid exit date format "${employee["Exit Date"]}" for employee ${employee["Name"]}. Use YYYY-MM-DD.`
            );
            return;
          }

          // Validate salary if provided
          if (employee["Salary"] && isNaN(Number(employee["Salary"]))) {
            console.error("Invalid salary for employee:", employee["Name"]);
            alert(
              `Invalid salary "${employee["Salary"]}" for employee ${employee["Name"]}.`
            );
            return;
          }

          // Process roles
          let employeeRoles = [];
          if (employee["Roles"]) {
            employeeRoles = employee["Roles"]
              .toString()
              .split(",")
              .map((r) => r.trim())
              .filter((r) => validRoles.includes(r.toLowerCase()));
          }

          // Generate unique employee ID
          let employeeId = generateEmployeeId(employee["Name"]);
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts) {
            const isEmployeeIdUnique = await checkUniqueId(
              "employees",
              "employeeId",
              employeeId
            );
            if (isEmployeeIdUnique) break;
            employeeId = generateEmployeeId(employee["Name"]);
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error(
              "Could not generate unique ID for employee:",
              employee["Name"]
            );
            alert(
              "Failed to generate unique ID for some employees. Please try again."
            );
            return;
          }

          // Create Firebase Auth user using secondary auth
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            employee["Email"],
            employee["Joining Date"].split("-").reverse().join("")
          ).catch((error) => {
            if (error.code === "auth/email-already-in-use") {
              console.error(
                "Email already in use for employee:",
                employee["Name"]
              );
              alert(
                `Email "${employee["Email"]}" is already registered for employee ${employee["Name"]}. Please use a different email.`
              );
            } else {
              console.error(
                "Error creating user for employee:",
                employee["Name"],
                error
              );
              alert(
                `Failed to create user for employee ${employee["Name"]}. Error: ${error.message}`
              );
            }
            throw error;
          });

          if (!userCredential) return;

          const user = userCredential.user;

          // Create new employee object
          const newEmployee = {
            employeeId,
            name: employee["Name"].trim(),
            email: employee["Email"].trim(),
            phone: employee["Phone"]?.toString().trim() || "",
            department: normalizedDepartment,
            designation: employee["Designation"].trim(),
            joiningDate: employee["Joining Date"].trim(),
            exitDate: employee["Exit Date"]?.trim() || "",
            salary: employee["Salary"]
              ? Number(employee["Salary"]).toString()
              : "",
            status: normalizedStatus,
            roles: employeeRoles,
            uid: user.uid,
          };

          // Save employee to Firestore
          try {
            const docRef = await addDoc(
              collection(db, "employees"),
              newEmployee
            );
            setEmployees((prev) => [
              ...prev,
              { id: docRef.id, ...newEmployee },
            ]);

            // Store roles in Firestore under the 'users' collection
            await setDoc(doc(db, "users", user.uid), {
              email: newEmployee.email,
              roles: newEmployee.roles,
            });
          } catch (error) {
            console.error("Error adding employee from Excel:", error);
            alert(
              `Failed to add employee ${
                employee["Name"] || "unknown"
              }. Error: ${error.message}`
            );
            return;
          }
        }
        alert("Employees imported successfully!");
      } catch (error) {
        console.error("Error processing Excel file:", error);
        alert(
          "Failed to process Excel file. Please ensure it contains the required fields (Name, Email, Department, Designation, Joining Date, Status) and is in a valid format (.xlsx, .xls, .csv)."
        );
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle Excel download
  const handleDownloadExcel = () => {
    const exportData = employees.map((employee) => ({
      Name: employee.name,
      Email: employee.email,
      Phone: employee.phone || "",
      Department: employee.department,
      Designation: employee.designation,
      "Joining Date": employee.joiningDate,
      "Exit Date": employee.exitDate || "",
      Salary: employee.salary || "",
      Status: employee.status,
      Roles: employee.roles ? employee.roles.join(", ") : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees_export.xlsx");
  };

  // Handle dummy Excel download
  const handleDownloadDummyExcel = () => {
    const dummyData = [
      {
        Name: "",
        Email: "",
        Phone: "",
        Department: "",
        Designation: "",
        "Joining Date": "",
        "Exit Date": "",
        Salary: "",
        Status: "",
        Roles: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees_dummy.xlsx");
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setViewDetailsOpen(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setName(employee.name);
    setEmail(employee.email);
    setPhone(employee.phone);
    setDepartment(employee.department);
    setDesignation(employee.designation);
    setJoiningDate(employee.joiningDate);
    setExitDate(employee.exitDate);
    setSalary(employee.salary);
    setStatus(employee.status);
    setSelectedRoles(employee.roles || []);
    setErrors({});
    setViewDetailsOpen(false);
    setOpen(true);
  };

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(email)) newErrors.email = "Invalid email format";
    if (!department) newErrors.department = "Department is required";
    if (!designation.trim()) newErrors.designation = "Designation is required";
    if (!joiningDate) newErrors.joiningDate = "Joining Date is required";
    if (!status) newErrors.status = "Status is required";
    if (salary && isNaN(Number(salary)))
      newErrors.salary = "Salary must be a number";
    if (exitDate && !/^\d{4}-\d{2}-\d{2}$/.test(exitDate))
      newErrors.exitDate = "Exit Date must be in YYYY-MM-DD format";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setConfirmUpdateOpen(true);
  };

  const confirmUpdate = async () => {
    let employeeId = editingEmployee
      ? editingEmployee.employeeId
      : generateEmployeeId(name);
    let attempts = 0;
    const maxAttempts = 10;

    if (!editingEmployee) {
      while (attempts < maxAttempts) {
        const isEmployeeIdUnique = await checkUniqueId(
          "employees",
          "employeeId",
          employeeId
        );
        if (isEmployeeIdUnique) break;
        employeeId = generateEmployeeId(name);
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error("Could not generate unique employee ID");
        alert("Failed to generate unique Employee ID. Please try again.");
        setConfirmUpdateOpen(false);
        return;
      }
    }

    if (editingEmployee) {
      const updatedEmployee = {
        employeeId,
        name,
        email,
        phone,
        department,
        designation,
        joiningDate,
        exitDate,
        salary,
        status,
        roles: selectedRoles,
        uid: editingEmployee.uid,
      };

      try {
        await updateDoc(
          doc(db, "employees", editingEmployee.id),
          updatedEmployee
        );
        setEmployees(
          employees.map((emp) =>
            emp.id === editingEmployee.id
              ? { id: emp.id, ...updatedEmployee }
              : emp
          )
        );

        await setDoc(
          doc(db, "users", editingEmployee.uid),
          {
            email,
            roles: selectedRoles,
          },
          { merge: true }
        );

        setConfirmUpdateOpen(false);
        handleClose();
      } catch (error) {
        console.error("Error updating employee:", error);
        alert("Failed to update employee. Please try again.");
      }
    } else {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          email,
          joiningDate.split("-").reverse().join("")
        ).catch((error) => {
          if (error.code === "auth/email-already-in-use") {
            alert(
              "This email is already registered. Please use a different email."
            );
          } else {
            console.error("Error creating user:", error);
            alert(`Failed to create user. Error: ${error.message}`);
          }
          throw error;
        });

        if (!userCredential) return;

        const user = userCredential.user;

        const newEmployee = {
          employeeId,
          name,
          email,
          phone,
          department,
          designation,
          joiningDate,
          exitDate,
          salary,
          status,
          roles: selectedRoles,
          uid: user.uid,
        };

        const docRef = await addDoc(collection(db, "employees"), newEmployee);
        setEmployees([...employees, { id: docRef.id, ...newEmployee }]);

        await setDoc(doc(db, "users", user.uid), {
          email,
          roles: selectedRoles,
        });

        setConfirmUpdateOpen(false);
        handleClose();
      } catch (error) {
        console.error("Error adding employee:", error);
      }
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setDepartment("");
    setDesignation("");
    setJoiningDate("");
    setExitDate("");
    setSalary("");
    setStatus("");
    setSelectedRoles([]);
    setEditingEmployee(null);
    setErrors({});
  };

  // Styles for form elements
  const formStyle = {
    border: "none",
  };

  const labelStyle = {
    fontSize: "15px",
    display: "block",
    width: "100%",
    marginTop: "8px",
    marginBottom: "5px",
    textAlign: "left",
    color: "#555",
    fontWeight: "bold",
  };

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "3px",
    fontSize: "12px",
  };

  const selectStyle = {
    display: "block",
    width: "100%",
    marginBottom: "15px",
    padding: "10px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "5px",
    fontSize: "12px",
  };

  const buttonStyle = {
    padding: "15px",
    borderRadius: "10px",
    margin: "15px",
    border: "none",
    color: "white",
    cursor: "pointer",
    backgroundColor: "#4caf50",
    width: "40%",
    fontSize: "16px",
    fontWeight: "bold",
  };

  const titleStyle = {
    fontSize: "x-large",
    textAlign: "center",
    color: "#327c35",
  };

  // Define tableData with paginated employees
  const tableData = {
    columns: [
      { Header: "Employee", accessor: "employee", width: "30%", align: "left" },
      { Header: "Designation & Dept", accessor: "designation", align: "left" },
      { Header: "Status", accessor: "status", align: "center" },
      { Header: "Joined Date", accessor: "joined", align: "center" },
      { Header: "Actions", accessor: "actions", align: "center" },
    ],
    rows: paginatedEmployees.map((employee) => ({
      employee: (
        <Employee
          name={employee.name}
          employeeId={employee.employeeId}
          email={employee.email}
        />
      ),
      designation: (
        <DesignationDept
          designation={employee.designation}
          department={employee.department}
        />
      ),
      status: <StatusBadge status={employee.status} />,
      joined: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {employee.joiningDate}
        </MDTypography>
      ),
      actions: (
        <MDBox display="flex" justifyContent="center">
          <Button
            variant="gradient"
            color="info"
            onClick={() => handleViewDetails(employee)}
            sx={{ mb: 2 }}
          >
            <VisibilityIcon />
          </Button>
          {!isReadOnly && (
            <Button
              variant="gradient"
              color="info"
              onClick={() => handleEdit(employee)}
              sx={{ mb: 2, ml: 1 }}
            >
              <EditIcon />
            </Button>
          )}
        </MDBox>
      ),
    })),
  };

  // Render loading state
  if (loadingRoles) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          Loading...
        </MDTypography>
      </Box>
    );
  }

  // Render access denied
  if (!hasAccess) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          You do not have permission to view this page.
        </MDTypography>
      </Box>
    );
  }

  // Render fetch error
  if (fetchError) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <MDTypography variant="h6" color="error">
          {fetchError}
        </MDTypography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: darkMode ? "background.default" : "background.paper",
        minHeight: "100vh",
      }}
    >
      <DashboardNavbar
        absolute
        light={!darkMode}
        isMini={false}
        sx={{
          backgroundColor: darkMode
            ? "rgba(33, 33, 33, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          width: {
            xs: "100%",
            md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 260px)",
          },
        }}
      />
      <Box
        p={3}
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          marginTop: { xs: "140px", md: "100px" },
          backgroundColor: darkMode ? "background.default" : "background.paper",
          minHeight: "calc(100vh - 80px)",
          paddingTop: { xs: "32px", md: "24px" },
          zIndex: 1000,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor={darkMode ? "dark" : "info"}
                borderRadius="lg"
                coloredShadow={darkMode ? "dark" : "info"}
              >
                <MDTypography variant="h6" color={darkMode ? "white" : "black"}>
                  Employee Management
                </MDTypography>
              </MDBox>
              <MDBox pt={2} pb={2} px={2}>
                {!isReadOnly && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      mb: 2,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      variant="gradient"
                      color={darkMode ? "dark" : "info"}
                      onClick={handleClickOpen}
                      startIcon={<AddIcon />}
                      sx={{
                        textTransform: "none",
                        fontWeight: "medium",
                        boxShadow: 3,
                        "&:hover": {
                          boxShadow: 6,
                          backgroundColor: darkMode ? "grey.700" : "info.dark",
                        },
                      }}
                    >
                      Add Employee
                    </Button>
                    <FormControl sx={{ minWidth: 150 }}>
                      <InputLabel id="excel-options-label">
                        Excel Options
                      </InputLabel>
                      <Select
                        labelId="excel-options-label"
                        value={excelOption}
                        onChange={handleExcelOptionChange}
                        label="Excel Options"
                        sx={{
                          height: "40px",
                          borderRadius: "8px",
                          backgroundColor: darkMode ? "#333" : "#fff",
                          "& .MuiSelect-select": {
                            padding: "10px",
                            color: darkMode ? "#fff" : "#000",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode ? "#555" : "#ccc",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode ? "#777" : "#888",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode ? "#0288d1" : "#1976d2",
                          },
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select an option
                        </MenuItem>
                        <MenuItem value="upload">Upload Excel</MenuItem>
                        <MenuItem value="download">Download Excel</MenuItem>
                        <MenuItem value="downloadDummy">
                          Download Dummy Excel
                        </MenuItem>
                      </Select>
                    </FormControl>
                    <input
                      id="file-upload"
                      type="file"
                      hidden
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                    />
                    <FormControl sx={{ minWidth: 150 }}>
                      <InputLabel id="filter-type-label">Filter By</InputLabel>
                      <Select
                        labelId="filter-type-label"
                        value={filterType}
                        onChange={(e) => {
                          setFilterType(e.target.value);
                          setFilterValue("");
                        }}
                        label="Filter By"
                        sx={{
                          height: "40px",
                          borderRadius: "8px",
                          backgroundColor: darkMode ? "#333" : "#fff",
                          "& .MuiSelect-select": {
                            padding: "10px",
                            color: darkMode ? "#fff" : "#000",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode ? "#555" : "#ccc",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode ? "#777" : "#888",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: darkMode ? "#0288d1" : "#1976d2",
                          },
                        }}
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="Department">Department</MenuItem>
                        <MenuItem value="Status">Status</MenuItem>
                      </Select>
                    </FormControl>
                    {filterType && (
                      <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel id="filter-value-label">Value</InputLabel>
                        <Select
                          labelId="filter-value-label"
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          label="Value"
                          sx={{
                            height: "40px",
                            borderRadius: "8px",
                            backgroundColor: darkMode ? "#333" : "#fff",
                            "& .MuiSelect-select": {
                              padding: "10px",
                              color: darkMode ? "#fff" : "#000",
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: darkMode ? "#555" : "#ccc",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: darkMode ? "#777" : "#888",
                            },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: darkMode ? "#0288d1" : "#1976d2",
                            },
                          }}
                        >
                          <MenuItem value="">Select Value</MenuItem>
                          {filterType === "Department" &&
                            departments.map((dept) => (
                              <MenuItem key={dept} value={dept}>
                                {dept}
                              </MenuItem>
                            ))}
                          {filterType === "Status" &&
                            statuses.map((status) => (
                              <MenuItem key={status} value={status}>
                                {status}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                )}
                <DataTable
                  table={tableData}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                  canSearch
                  onSearch={(query) =>
                    setSearchQuery(query.trim().toLowerCase())
                  }
                  searchProps={{
                    onChange: (e) =>
                      setSearchQuery(e.target.value.trim().toLowerCase()),
                    placeholder: "Search employees...",
                  }}
                />
                <MDBox display="flex" justifyContent="center" mt={2}>
                  <Button
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    sx={{
                      mx: 1,
                      color: darkMode ? "#ffffff" : "#000000",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                  >
                    {"<"}
                  </Button>
                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <Button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      sx={{
                        mx: 0.5,
                        backgroundColor:
                          currentPage === page
                            ? darkMode
                              ? "#0288d1"
                              : "info.main"
                            : darkMode
                            ? "#424242"
                            : "#e0e0e0",
                        color:
                          currentPage === page
                            ? "#ffffff"
                            : darkMode
                            ? "#ffffff"
                            : "#000000",
                        borderRadius: "50%",
                        minWidth: "36px",
                        height: "36px",
                        fontWeight: "bold",
                        fontSize: "14px",
                        "&:hover": {
                          backgroundColor:
                            currentPage === page
                              ? darkMode
                                ? "#0277bd"
                                : "info.dark"
                              : darkMode
                              ? "#616161"
                              : "#bdbdbd",
                        },
                      }}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    sx={{
                      mx: 1,
                      color: darkMode ? "#ffffff" : "#000000",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                  >
                    {">"}
                  </Button>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            padding: "16px",
            border: darkMode ? "1px solid #333" : "1px solid #e0e0e0",
          },
        }}
      >
        <DialogTitle
          sx={{
            color: darkMode ? "#ffffff" : "#1976d2",
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "1.5rem",
            borderBottom: darkMode ? "1px solid #333" : "1px solid #e0e0e0",
            pb: 2,
          }}
        >
          Employee Details
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedEmployee && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {[
                { label: "Employee ID", value: selectedEmployee.employeeId },
                { label: "Name", value: selectedEmployee.name },
                { label: "Email", value: selectedEmployee.email },
                { label: "Phone", value: selectedEmployee.phone || "N/A" },
                { label: "Department", value: selectedEmployee.department },
                { label: "Designation", value: selectedEmployee.designation },
                { label: "Joining Date", value: selectedEmployee.joiningDate },
                {
                  label: "Exit Date",
                  value: selectedEmployee.exitDate || "N/A",
                },
                { label: "Salary", value: selectedEmployee.salary || "N/A" },
                { label: "Status", value: selectedEmployee.status },
                {
                  label: "Roles",
                  value: selectedEmployee.roles
                    ? selectedEmployee.roles.join(", ")
                    : "N/A",
                },
              ].map(({ label, value }) => (
                <Grid item xs={12} sm={6} key={label}>
                  <MDTypography
                    variant="subtitle2"
                    color={darkMode ? "#aaaaaa" : "#555"}
                    fontWeight="medium"
                    sx={{ mb: 0.5 }}
                  >
                    {label}
                  </MDTypography>
                  <MDTypography
                    color={darkMode ? "#ffffff" : "#000"}
                    sx={{ fontSize: "1rem", wordBreak: "break-word" }}
                  >
                    {value}
                  </MDTypography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          <Button
            onClick={() => setViewDetailsOpen(false)}
            sx={{
              backgroundColor: darkMode ? "#0288d1" : "#1976d2",
              color: "#ffffff",
              borderRadius: "8px",
              px: 3,
              py: 1,
              "&:hover": {
                backgroundColor: darkMode ? "#0277bd" : "#1565c0",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {!isReadOnly && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: "#f3f3f3",
              borderRadius: "15px",
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
              width: "500px",
              margin: "auto",
            },
          }}
        >
          <DialogTitle sx={{ ...titleStyle }}>
            {editingEmployee ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
          <DialogContent sx={{ py: 2, padding: "10px 20px" }}>
            <fieldset style={formStyle}>
              <form>
                <label style={labelStyle} htmlFor="name">
                  Name*
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: errors.name ? "red" : "#ddd",
                  }}
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Name"
                  required
                />
                {errors.name && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {errors.name}
                  </span>
                )}

                <label style={labelStyle} htmlFor="email">
                  Email*
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: errors.email ? "red" : "#ddd",
                  }}
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Email"
                  required
                />
                {errors.email && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {errors.email}
                  </span>
                )}

                <label style={labelStyle} htmlFor="phone">
                  Phone
                </label>
                <input
                  style={inputStyle}
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter Phone"
                />

                <label style={labelStyle} htmlFor="department">
                  Department*
                </label>
                <select
                  style={{
                    ...selectStyle,
                    borderColor: errors.department ? "red" : "#ddd",
                  }}
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select Department
                  </option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {errors.department}
                  </span>
                )}

                <label style={labelStyle} htmlFor="designation">
                  Designation*
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: errors.designation ? "red" : "#ddd",
                  }}
                  type="text"
                  id="designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Enter Designation"
                  required
                />
                {errors.designation && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {errors.designation}
                  </span>
                )}

                <label style={labelStyle} htmlFor="joiningDate">
                  Joining Date*
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: errors.joiningDate ? "red" : "#ddd",
                  }}
                  type="date"
                  id="joiningDate"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  required
                />
                {errors.joiningDate && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {errors.joiningDate}
                  </span>
                )}

                <label style={labelStyle} htmlFor="exitDate">
                  Exit Date
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: errors.exitDate ? "red" : "#ddd",
                  }}
                  type="date"
                  id="exitDate"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                />
                {errors.exitDate && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {errors.exitDate}
                  </span>
                )}

                <label style={labelStyle} htmlFor="salary">
                  Salary
                </label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: errors.salary ? "red" : "#ddd",
                  }}
                  type="number"
                  id="salary"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="Enter Salary"
                />
                {errors.salary && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {errors.salary}
                  </span>
                )}

                <label style={labelStyle} htmlFor="status">
                  Status*
                </label>
                <select
                  style={{
                    ...selectStyle,
                    borderColor: errors.status ? "red" : "#ddd",
                  }}
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select Status
                  </option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <span style={{ color: "red", fontSize: "12px" }}>
                    {errors.status}
                  </span>
                )}

                <label style={labelStyle}>Roles</label>
                <Box
                  sx={{
                    maxHeight: "150px",
                    overflowY: "auto",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    padding: "10px",
                  }}
                >
                  {roles.map((role) => (
                    <Box
                      key={role}
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedRoles((prev) =>
                            checked
                              ? [...prev, role]
                              : prev.filter((r) => r !== role)
                          );
                        }}
                      />
                      <MDTypography sx={{ ml: 1 }}>{role}</MDTypography>
                    </Box>
                  ))}
                </Box>
              </form>
            </fieldset>
          </DialogContent>
          <DialogActions
            sx={{ padding: "16px 24px", justifyContent: "center" }}
          >
            <button style={buttonStyle} onClick={handleClose}>
              Cancel
            </button>
            <button style={buttonStyle} onClick={handleSubmit}>
              Save
            </button>
          </DialogActions>
        </Dialog>
      )}

      {!isReadOnly && (
        <Dialog
          open={confirmUpdateOpen}
          onClose={() => setConfirmUpdateOpen(false)}
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: darkMode
                ? "background.default"
                : "background.paper",
              borderRadius: "12px",
            },
          }}
        >
          <DialogTitle sx={{ color: darkMode ? "white" : "black" }}>
            Ready to update employee details?
          </DialogTitle>
          <DialogActions>
            <Button
              onClick={() => setConfirmUpdateOpen(false)}
              sx={{
                color: darkMode ? "#ffffff" : "#000000",
                textTransform: "none",
                fontWeight: "bold",
                fontSize: "16px",
                padding: "8px 20px",
                borderRadius: "8px",
                border: darkMode ? "1px solid #ffffff" : "1px solid #000000",
                "&:hover": {
                  backgroundColor: darkMode
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.1)",
                  color: darkMode ? "#ffffff" : "#000000",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpdate}
              sx={{
                backgroundColor: darkMode ? "#4fc3f7" : "#1976d2",
                color: "#ffffff",
                textTransform: "none",
                fontWeight: "bold",
                fontSize: "16px",
                padding: "8px 20px",
                borderRadius: "8px",
                "&:hover": {
                  backgroundColor: darkMode ? "#29b6f6" : "#1565c0",
                },
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "260px" },
          backgroundColor: darkMode ? "background.default" : "background.paper",
          zIndex: 1100,
        }}
      >
        <Footer />
      </Box>
    </Box>
  );
};

export default ManageEmployee;
