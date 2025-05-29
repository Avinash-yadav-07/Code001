import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
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
  Timestamp,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useMaterialUIController } from "context";
import * as XLSX from "xlsx";

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
  "ManageCustomer:read",
  "ManageCustomer:full access",
];

const generateEmployeeId = (name) => {
  const prefix = name.substring(0, 3).toUpperCase();
  const randomNumber = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${randomNumber}`;
};

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("");
  const [totalLeave, setTotalLeave] = useState("18");
  const [takenLeave, setTakenLeave] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  const formContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
    padding: "10px 20px",
    width: "90%",
    maxWidth: "500px",
    maxHeight: "80vh",
    overflowY: "auto",
    textAlign: "center",
    margin: "auto",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1200,
    transition: "transform 0.2s",
  };

  const formInputStyle = {
    display: "block",
    width: "100%",
    padding: "6px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "3px",
    fontSize: "12px",
    marginBottom: "10px",
  };

  const formSelectStyle = {
    ...formInputStyle,
    padding: "8px",
    borderRadius: "5px",
    height: "32px",
  };

  const formCheckboxStyle = {
    display: "inline",
    width: "auto",
    marginRight: "5px",
  };

  const formLabelStyle = {
    fontSize: "14px",
    display: "block",
    width: "100%",
    marginTop: "6px",
    marginBottom: "4px",
    textAlign: "left",
    color: "#555",
    fontWeight: "bold",
  };

  const formButtonStyle = {
    padding: "10px",
    borderRadius: "10px",
    margin: "10px",
    border: "none",
    color: "white",
    cursor: "pointer",
    backgroundColor: "#4caf50",
    width: "40%",
    fontSize: "14px",
  };

  const formHeadingStyle = {
    fontSize: "large",
    textAlign: "center",
    color: "#327c35",
    margin: "10px 0",
  };

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchError(null);

        // Fetch employees
        const employeesSnapshot = await getDocs(collection(db, "employees"));
        const employeesData = employeesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          totalLeave: "18", // Set total leaves to 18 for all employees
        }));

        // Fetch leave applications
        const leaveSnapshot = await getDocs(
          collection(db, "leaveApplications")
        );
        const leaveData = leaveSnapshot.docs.map((doc) => doc.data());

        // Calculate taken leaves for each employee
        const employeesWithLeaves = employeesData.map((employee) => {
          const employeeLeaves = leaveData.filter(
            (leave) =>
              leave.name === employee.name && leave.status === "Approved"
          );
          const takenLeave = employeeLeaves.reduce(
            (total, leave) => total + (leave.numberOfDays || 0),
            0
          );

          return {
            ...employee,
            takenLeave: takenLeave.toString(),
          };
        });

        setEmployees(employeesWithLeaves);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setFetchError("Failed to fetch employees. Please try again.");
      }
    };

    if (!loadingRoles) {
      fetchData();
    }
  }, [loadingRoles]);

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      searchQuery === "" ||
      employee.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === "" ||
      (filterType === "Department" && employee.department === filterValue) ||
      (filterType === "Status" && employee.status === filterValue);

    return matchesSearch && matchesFilter;
  });

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
          if (cleanName.includes("totalleave") || cleanName.includes("total"))
            return "Total Leave";
          if (cleanName.includes("takenleave") || cleanName.includes("taken"))
            return "Taken Leave";
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

          if (employee["Salary"] && isNaN(Number(employee["Salary"]))) {
            console.error("Invalid salary for employee:", employee["Name"]);
            alert(
              `Invalid salary "${employee["Salary"]}" for employee ${employee["Name"]}.`
            );
            return;
          }

          if (
            employee["Total Leave"] &&
            isNaN(Number(employee["Total Leave"]))
          ) {
            console.error(
              "Invalid total leave for employee:",
              employee["Name"]
            );
            alert(
              `Invalid total leave "${employee["Total Leave"]}" for employee ${employee["Name"]}.`
            );
            return;
          }

          if (
            employee["Taken Leave"] &&
            isNaN(Number(employee["Taken Leave"]))
          ) {
            console.error(
              "Invalid taken leave for employee:",
              employee["Name"]
            );
            alert(
              `Invalid taken leave "${employee["Taken Leave"]}" for employee ${employee["Name"]}.`
            );
            return;
          }

          let employeeRoles = [];
          if (employee["Roles"]) {
            employeeRoles = employee["Roles"]
              .toString()
              .split(",")
              .map((r) => r.trim())
              .filter((r) => validRoles.includes(r.toLowerCase()));
          }

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
            totalLeave: "18",
            takenLeave: employee["Taken Leave"]
              ? Number(employee["Taken Leave"]).toString()
              : "",
            roles: employeeRoles,
            uid: user.uid,
          };

          try {
            const docRef = await addDoc(
              collection(db, "employees"),
              newEmployee
            );
            setEmployees((prev) => [
              ...prev,
              { id: docRef.id, ...newEmployee },
            ]);

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
          "Failed to process Excel file. Please ensure it contains the required fields (Name, Email, Department, Designation, Joining Date, Status, Total Leave) and is in a valid format (.xlsx, .xls, .csv)."
        );
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

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
      "Total Leave": "18",
      "Taken Leave": employee.takenLeave || "0",
      Roles: employee.roles ? employee.roles.join(", ") : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees_export.xlsx");
  };

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
        "Total Leave": "18",
        "Taken Leave": "",
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
    setTotalLeave("18");
    setTakenLeave(employee.takenLeave || "");
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
    if (takenLeave && isNaN(Number(takenLeave)))
      newErrors.takenLeave = "Taken Leave must be a number";
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
        totalLeave: "18",
        takenLeave,
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
          totalLeave: "18",
          takenLeave,
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
    setTotalLeave("18");
    setTakenLeave("");
    setSelectedRoles([]);
    setEditingEmployee(null);
    setErrors({});
  };

  const tableData = {
    columns: [
      { Header: "Employee", accessor: "employee", width: "30%", align: "left" },
      {
        Header: "Designation & Dept",
        accessor: "designation",
        align: "center",
      },
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
        <MDTypography variant="caption" color="text">
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
        <MDTypography variant="h6" color={darkMode ? "white" : "primary"}>
          Loading...
        </MDTypography>
      </Box>
    );
  }

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
        <MDTypography variant="h6" color={darkMode ? "white" : "primary"}>
          You do not have permission to view this page.
        </MDTypography>
      </Box>
    );
  }

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
        backgroundColor: darkMode ? "#212121" : "#f3f3f3",
        minHeight: "100vh",
      }}
    >
      <DashboardNavbar
        absolute
        light={!darkMode}
        sx={{
          backgroundColor: darkMode
            ? "rgba(33, 33, 33, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          width: {
            xs: "100%",
            md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)",
          },
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      />
      <MDBox
        p={3}
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          marginTop: { xs: "140px", md: "100px" },
          backgroundColor: darkMode ? "#212121" : "#f3f3f3",
          minHeight: "calc(100vh - 80px)",
          paddingTop: { xs: "32px", md: "24px" },
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
                <MDTypography variant="h6" color="white">
                  Employee Management
                </MDTypography>
              </MDBox>
              <MDBox
                pt={2}
                pb={2}
                px={2}
                display="flex"
                flexDirection={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretch", sm: "center" }}
                gap={2}
                flexWrap="wrap"
              >
                {!isReadOnly && (
                  <>
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
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      Add Employee
                    </Button>
                    <FormControl sx={{ minWidth: "150px" }}>
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
                          "& .MuiSelect-select": { padding: "8px" },
                        }}
                      >
                        <MenuItem value="" disabled>
                          Select an option
                        </MenuItem>
                        <MenuItem value="upload">Upload</MenuItem>
                        <MenuItem value="download">Download Excel</MenuItem>
                        <MenuItem value="downloadDummy">
                          Download Dummy
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
                    <FormControl sx={{ minWidth: "150px" }}>
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
                          "& .MuiSelect-select": { padding: "8px" },
                        }}
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="Department">Department</MenuItem>
                        <MenuItem value="Status">Status</MenuItem>
                      </Select>
                    </FormControl>
                    {filterType && (
                      <FormControl sx={{ minWidth: "150px" }}>
                        <InputLabel id="filter-value-label">Value</InputLabel>
                        <Select
                          labelId="filter-value-label"
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          label="Value"
                          sx={{
                            height: "40px",
                            "& .MuiSelect-select": { padding: "8px" },
                          }}
                        >
                          <MenuItem value="">Select</MenuItem>
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
                  </>
                )}
              </MDBox>
              <MDBox px={2} pb={3}>
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
                    placeholder: "Search employees by name...",
                  }}
                />
                <MDBox display="flex" justifyContent="center" mt={2}>
                  <Button
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    sx={{
                      mx: "1px",
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
                        mx: "0.5px",
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
                      mx: "1px",
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
      </MDBox>
      {!isReadOnly && (
        <>
          <Box sx={{ ...formContainerStyle, display: open ? "block" : "none" }}>
            <Typography sx={formHeadingStyle}>
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </Typography>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <label style={formLabelStyle}>Name*</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Name"
                required
                style={{
                  ...formInputStyle,
                  borderColor: errors.name ? "red" : "#ddd",
                }}
              />
              {errors.name && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.name}
                </span>
              )}
              <label style={formLabelStyle}>Email*</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                required
                style={{
                  ...formInputStyle,
                  borderColor: errors.email ? "red" : "#ddd",
                }}
              />
              {errors.email && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.email}
                </span>
              )}
              <label style={formLabelStyle}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter Phone"
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Department*</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                style={{
                  ...formSelectStyle,
                  borderColor: errors.department ? "red" : "#ddd",
                }}
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
              <label style={formLabelStyle}>Designation*</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Enter Designation"
                required
                style={{
                  ...formInputStyle,
                  borderColor: errors.designation ? "red" : "#ddd",
                }}
              />
              {errors.designation && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.designation}
                </span>
              )}
              <label style={formLabelStyle}>Joining Date*</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
                style={{
                  ...formInputStyle,
                  borderColor: errors.joiningDate ? "red" : "#ddd",
                }}
              />
              {errors.joiningDate && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.joiningDate}
                </span>
              )}
              <label style={formLabelStyle}>Exit Date</label>
              <input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                style={{
                  ...formInputStyle,
                  borderColor: errors.exitDate ? "red" : "#ddd",
                }}
              />
              {errors.exitDate && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.exitDate}
                </span>
              )}
              <label style={formLabelStyle}>Salary</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="Enter Salary"
                style={{
                  ...formInputStyle,
                  borderColor: errors.salary ? "red" : "#ddd",
                }}
              />
              {errors.salary && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.salary}
                </span>
              )}
              <label style={formLabelStyle}>Total Leave*</label>
              <input
                type="number"
                value={totalLeave}
                readOnly
                style={{
                  ...formInputStyle,
                  backgroundColor: "#f0f0f0",
                  borderColor: "#ddd",
                }}
              />
              <label style={formLabelStyle}>Taken Leave</label>
              <input
                type="number"
                value={takenLeave}
                onChange={(e) => setTakenLeave(e.target.value)}
                placeholder="Enter Taken Leave"
                style={{
                  ...formInputStyle,
                  borderColor: errors.takenLeave ? "red" : "#ddd",
                }}
              />
              {errors.takenLeave && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.takenLeave}
                </span>
              )}
              <label style={formLabelStyle}>Status*</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                style={{
                  ...formSelectStyle,
                  borderColor: errors.status ? "red" : "#ddd",
                }}
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
              <label style={formLabelStyle}>Roles</label>
              <Box
                sx={{
                  maxHeight: "100px",
                  overflowY: "auto",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  padding: "10px",
                  mb: 1,
                }}
              >
                {roles.map((role) => (
                  <Box
                    key={role}
                    sx={{ display: "flex", alignItems: "center", mb: "6px" }}
                  >
                    <input
                      type="checkbox"
                      id={role}
                      checked={selectedRoles.includes(role)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedRoles((prev) =>
                          checked
                            ? [...prev, role]
                            : prev.filter((r) => r !== role)
                        );
                      }}
                      style={formCheckboxStyle}
                    />
                    <label
                      htmlFor={role}
                      style={{
                        ...formLabelStyle,
                        display: "inline",
                        marginLeft: "5px",
                        fontWeight: "normal",
                      }}
                    >
                      {role}
                    </label>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={formButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={formButtonStyle}>
                  Save
                </button>
              </Box>
            </form>
          </Box>
          <Box
            sx={{
              ...formContainerStyle,
              display: confirmUpdateOpen ? "block" : "none",
            }}
          >
            <Typography sx={formHeadingStyle}>
              Ready to update employee details?
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setConfirmUpdateOpen(false)}
                style={formButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpdate}
                style={formButtonStyle}
              >
                Confirm
              </button>
            </Box>
          </Box>
        </>
      )}
      <Box
        sx={{
          ...formContainerStyle,
          display: viewDetailsOpen ? "block" : "none",
        }}
      >
        <Typography sx={{ ...formHeadingStyle, mb: 2 }}>
          Employee Details
        </Typography>
        {selectedEmployee && (
          <Grid container spacing={2}>
            {[
              { label: "Employee ID", value: selectedEmployee.employeeId },
              { label: "Name", value: selectedEmployee.name },
              { label: "Email", value: selectedEmployee.email },
              { label: "Phone", value: selectedEmployee.phone || "N/A" },
              { label: "Department", value: selectedEmployee.department },
              { label: "Designation", value: selectedEmployee.designation },
              { label: "Joining Date", value: selectedEmployee.joiningDate },
              { label: "Exit Date", value: selectedEmployee.exitDate || "N/A" },
              { label: "Salary", value: selectedEmployee.salary || "N/A" },
              { label: "Total Leave", value: "18" },
              {
                label: "Taken Leave",
                value: selectedEmployee.takenLeave || "0",
              },
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
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <button
            type="button"
            onClick={() => setViewDetailsOpen(false)}
            style={formButtonStyle}
          >
            Close
          </button>
        </Box>
      </Box>
      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          backgroundColor: darkMode ? "#212121" : "#f3f3f3",
        }}
      >
        <Footer />
      </Box>
    </Box>
  );
};

export default ManageEmployee;
