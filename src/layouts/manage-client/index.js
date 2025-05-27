import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  Chip,
  CardContent,
  Box,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CardActions,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import AddIcon from "@mui/icons-material/Add";
import { useMaterialUIController } from "context";
import * as XLSX from "xlsx";
import { casual } from "chrono-node";

// Define constants for statuses and industries
const statuses = ["Active", "Inactive"];
const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
];

// Utility function to format Firestore timestamps
const formatTimestamp = (timestamp) => {
  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString();
  }
  return timestamp || "N/A";
};

// Utility function to generate random numbers for IDs
const generateRandomNumber = () => Math.floor(100 + Math.random() * 900);

// Generate unique client ID
const generateClientId = () => `CL-${generateRandomNumber()}`;

// Generate unique contract ID
const generateContractId = () => `CON-${generateRandomNumber()}`;

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

// Clean numeric values for consistency
const cleanNumericValue = (value) => {
  if (typeof value === "string") {
    return parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0;
  }
  return parseFloat(value) || 0;
};

// Validate date strings
const validateDate = (dateStr) => {
  const parsed = casual.parseDate(dateStr);
  return parsed ? dateStr : null;
};

// Main component for client management
const ManageClient = () => {
  // State declarations for form fields and UI
  const [open, setOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [cac, setCac] = useState("");
  const [cltv, setCltv] = useState("");
  const [revenueGenerated, setRevenueGenerated] = useState("");
  const [oneTimeRevenue, setOneTimeRevenue] = useState("");
  const [recurringRevenue, setRecurringRevenue] = useState("");
  const [status, setStatus] = useState("");
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [excelOption, setExcelOption] = useState("");

  // Styles adapted from ManageCustomer
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

  // Fetch user roles from Firestore
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

  // Determine user permissions
  const isReadOnly =
    userRoles.includes("ManageClient:read") &&
    !userRoles.includes("ManageClient:full access");
  const hasAccess =
    userRoles.includes("ManageClient:read") ||
    userRoles.includes("ManageClient:full access");

  // Fetch clients and projects from Firestore
  const fetchAllData = useCallback(async () => {
    try {
      setLoadingProjects(true);
      setFetchError(null);
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        setFetchError("No authenticated user. Please log in.");
        return;
      }

      let clientsQuery = collection(db, "clients");
      if (isReadOnly) {
        clientsQuery = query(clientsQuery, where("email", "==", user.email));
      }
      clientsQuery = query(
        clientsQuery,
        where("status", "in", ["Active", "Inactive"])
      );

      const projectsQuery = query(
        collection(db, "projects"),
        where("status", "in", ["Active", "Ongoing"])
      );

      const [clientsSnapshot, projectsSnapshot] = await Promise.all([
        getDocs(clientsQuery),
        getDocs(projectsQuery),
      ]);

      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        projectId: doc.data().projectId || "Unknown",
        name: doc.data().name || "Unknown",
        ...doc.data(),
      }));

      console.log("Fetched projects:", projectsData);
      setClients(clientsData);
      setProjects(projectsData);
      if (projectsData.length === 0) {
        console.warn("No active or ongoing projects found in Firestore");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setFetchError("Failed to fetch data. Please try again.");
    } finally {
      setLoadingProjects(false);
    }
  }, [isReadOnly]);

  // Trigger data fetch when roles are loaded
  useEffect(() => {
    if (!loadingRoles) {
      fetchAllData();
    }
  }, [loadingRoles, fetchAllData]);

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

    // Reset the select value after action
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
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          blankrows: false,
        });

        const validProjectIds = projects.map((p) => p.projectId);

        // Normalize column names for Excel import
        const normalizeColumnName = (name) => {
          if (!name) return "";
          const cleanName = name.trim().toLowerCase().replace(/\s+/g, "");
          if (cleanName.includes("name") || cleanName.includes("clientname"))
            return "Name";
          if (cleanName.includes("email")) return "Email";
          if (cleanName.includes("phone")) return "Phone";
          if (cleanName.includes("address")) return "Address";
          if (cleanName.includes("industry")) return "Industry";
          if (
            cleanName.includes("contractstart") ||
            cleanName.includes("startdate")
          )
            return "Contract Start Date";
          if (
            cleanName.includes("contractend") ||
            cleanName.includes("enddate")
          )
            return "Contract End Date";
          if (
            cleanName.includes("contractamount") ||
            cleanName.includes("amount")
          )
            return "Contract Amount";
          if (cleanName.includes("cac")) return "CAC";
          if (cleanName.includes("cltv")) return "CLTV";
          if (
            cleanName.includes("revenuegenerated") ||
            cleanName.includes("totalrevenue")
          )
            return "Revenue Generated";
          if (cleanName.includes("onetime") || cleanName.includes("onetime"))
            return "One-Time Revenue";
          if (cleanName.includes("recurringrevenue"))
            return "Recurring Revenue";
          if (cleanName.includes("status")) return "Status";
          if (cleanName.includes("projectid") || cleanName.includes("projects"))
            return "Project IDs";
          return name;
        };

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeColumnName(key)] = row[key];
          });
          return normalizedRow;
        });

        for (const client of normalizedData) {
          let newClientId = generateClientId();
          let newContractId = generateContractId();
          let attempts = 0;
          const maxAttempts = 10;

          // Ensure unique client ID
          while (attempts < maxAttempts) {
            const isClientIdUnique = await checkUniqueId(
              "clients",
              "clientId",
              newClientId
            );
            if (isClientIdUnique) break;
            newClientId = generateClientId();
            attempts++;
          }

          // Ensure unique contract ID
          attempts = 0;
          while (attempts < maxAttempts) {
            const isContractIdUnique = await checkUniqueId(
              "clients",
              "contractId",
              newContractId
            );
            if (isContractIdUnique) break;
            newContractId = generateContractId();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error(
              "Could not generate unique IDs for client:",
              client["Name"]
            );
            alert(
              "Failed to generate unique IDs for some clients. Please try again."
            );
            return;
          }

          // Validate required fields
          if (
            !client["Name"]?.trim() ||
            !client["Email"]?.trim() ||
            !client["Industry"]?.trim() ||
            !client["Contract Start Date"] ||
            !client["Contract End Date"] ||
            !client["Contract Amount"] ||
            !client["Status"]?.trim()
          ) {
            console.error("Missing required fields in client:", client["Name"]);
            alert(
              `Missing required fields for client ${
                client["Name"] || "unknown"
              }. Required: Name, Email, Industry, Contract Start Date, Contract End Date, Contract Amount, Status.`
            );
            return;
          }

          // Validate industry
          const normalizedIndustry = client["Industry"].trim();
          if (
            !industries
              .map((i) => i.toLowerCase())
              .includes(normalizedIndustry.toLowerCase())
          ) {
            console.error("Invalid industry for client:", client["Name"]);
            alert(
              `Invalid industry "${client["Industry"]}" for client ${client["Name"]}.`
            );
            return;
          }

          // Validate status
          const normalizedStatus = client["Status"].trim();
          if (
            !statuses
              .map((s) => s.toLowerCase())
              .includes(normalizedStatus.toLowerCase())
          ) {
            console.error("Invalid status for client:", client["Name"]);
            alert(
              `Invalid status "${client["Status"]}" for client ${client["Name"]}.`
            );
            return;
          }

          // Process dates
          let startDate = client["Contract Start Date"];
          let endDate = client["Contract End Date"];

          if (startDate instanceof Date) {
            startDate = startDate.toISOString().substring(0, 10);
          } else {
            startDate = validateDate(client["Contract Start Date"]?.toString());
          }
          if (endDate instanceof Date) {
            endDate = endDate.toISOString().substring(0, 10);
          } else {
            endDate = validateDate(client["Contract End Date"]?.toString());
          }

          if (!startDate) {
            console.error(
              "Invalid contract start date for client:",
              client["Name"]
            );
            alert(
              `Invalid contract start date "${client["Contract Start Date"]}" for client ${client["Name"]}.`
            );
            return;
          }
          if (!endDate) {
            console.error(
              "Invalid contract end date for client:",
              client["Name"]
            );
            alert(
              `Invalid contract end date "${client["Contract End Date"]}" for client ${client["Name"]}.`
            );
            return;
          }

          // Validate contract amount
          const contractAmount = cleanNumericValue(client["Contract Amount"]);
          if (contractAmount <= 0) {
            console.error(
              "Invalid contract amount for client:",
              client["Name"]
            );
            alert(
              `Contract amount must be positive for client ${client["Name"]}.`
            );
            return;
          }

          // Validate CAC
          const cac = cleanNumericValue(client["CAC"] || 0);
          if (cac < 0) {
            console.error("Invalid CAC for client:", client["Name"]);
            alert(`CAC cannot be negative for client ${client["Name"]}.`);
            return;
          }

          // Validate CLTV
          const cltv = cleanNumericValue(client["CLTV"] || 0);
          if (cltv < 0) {
            console.error("Invalid CLTV for client:", client["Name"]);
            alert(`CLTV cannot be negative for client ${client["Name"]}.`);
            return;
          }

          // Validate revenue generated
          const revenueGenerated = cleanNumericValue(
            client["Revenue Generated"] || 0
          );
          if (revenueGenerated < 0) {
            console.error(
              "Invalid revenue generated for client:",
              client["Name"]
            );
            alert(
              `Revenue generated cannot be negative for client ${client["Name"]}.`
            );
            return;
          }

          // Validate one-time revenue
          const oneTimeRevenue = cleanNumericValue(
            client["One-Time Revenue"] || 0
          );
          if (oneTimeRevenue < 0) {
            console.error(
              "Invalid one-time revenue for client:",
              client["Name"]
            );
            alert(
              `One-time revenue cannot be negative for client ${client["Name"]}.`
            );
            return;
          }

          // Validate recurring revenue
          const recurringRevenue = cleanNumericValue(
            client["Recurring Revenue"] || 0
          );
          if (recurringRevenue < 0) {
            console.error(
              "Invalid recurring revenue for client:",
              client["Name"]
            );
            alert(
              `Recurring revenue cannot be negative for client ${client["Name"]}.`
            );
            return;
          }

          // Process project IDs
          let projectIds = [];
          if (client["Project IDs"]) {
            projectIds = client["Project IDs"]
              .toString()
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id);
            projectIds = projectIds.filter((id) =>
              validProjectIds.includes(id)
            );
          }

          // Create new client object
          const newClient = {
            clientId: newClientId,
            contractId: newContractId,
            name: client["Name"].trim(),
            email: client["Email"].trim(),
            phone: client["Phone"]?.toString().trim() || "",
            address: client["Address"]?.toString().trim() || "",
            industry: normalizedIndustry,
            contractStartDate: startDate,
            contractEndDate: endDate,
            contractAmount: contractAmount,
            Metrics: {
              cac: cac,
              cltv: cltv,
              revenueGenerated: revenueGenerated,
              revenueBreakdown: {
                oneTimeRevenue: oneTimeRevenue,
                recurringRevenue: recurringRevenue,
              },
            },
            status: normalizedStatus,
            projects: projectIds,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Save client to Firestore
          try {
            const docRef = await addDoc(collection(db, "clients"), newClient);
            setClients((prev) => [...prev, { id: docRef.id, ...newClient }]);
          } catch (error) {
            console.error("Error adding client from Excel:", error);
            alert(
              `Failed to add client ${client["Name"] || "unknown"}. Error: ${
                error.message
              }`
            );
            return;
          }
        }
        alert("Clients imported successfully!");
        fetchAllData();
      } catch (error) {
        console.error("Error processing Excel file:", error);
        alert(
          "Failed to process Excel file. Please ensure it contains the required fields (Name, Email, Industry, Contract Start Date, Contract End Date, Contract Amount, Status) and is in a valid format (.xlsx, .xls, .csv)."
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
    const exportData = clients.map((client) => ({
      Name: client.name,
      Email: client.email,
      Phone: client.phone || "N/A",
      Address: client.address || "N/A",
      Industry: client.industry,
      "Contract Start Date": formatTimestamp(client.contractStartDate),
      "Contract End Date": formatTimestamp(client.contractEndDate),
      "Contract Amount": client.contractAmount,
      CAC: client.Metrics?.cac || 0,
      CLTV: client.Metrics?.cltv || 0,
      "Revenue Generated": client.Metrics?.revenueGenerated || 0,
      "One-Time Revenue": client.Metrics?.revenueBreakdown?.oneTimeRevenue || 0,
      "Recurring Revenue":
        client.Metrics?.revenueBreakdown?.recurringRevenue || 0,
      Status: client.status,
      Projects: Array.isArray(client.projects)
        ? client.projects
            .map((projectId) => {
              const project = projects.find((p) => p.projectId === projectId);
              return project
                ? `${project.name || "Unknown"} (${project.projectId})`
                : projectId;
            })
            .join(", ")
        : "",
      "Created At": formatTimestamp(client.createdAt),
      "Updated At": formatTimestamp(client.updatedAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients_export.xlsx");
  };

  // Handle dummy Excel download
  const handleDownloadDummyExcel = () => {
    const dummyData = [
      {
        Name: "",
        Email: "",
        Phone: "",
        Address: "",
        Industry: "",
        "Contract Start Date": "",
        "Contract End Date": "",
        "Contract Amount": "",
        CAC: "",
        CLTV: "",
        "Revenue Generated": "",
        "One-Time Revenue": "",
        "Recurring Revenue": "",
        Status: "",
        "Project IDs": "",
        "Created At": "",
        "Updated At": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients_dummy.xlsx");
  };

  // Open dialog for adding/editing client
  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  // Close dialog
  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  // Populate form for editing client
  const handleEdit = (client) => {
    setEditingClient(client);
    setName(client.name || "");
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setAddress(client.address || "");
    setIndustry(client.industry || "");
    setContractStartDate(
      client.contractStartDate &&
        typeof client.contractStartDate.toDate === "function"
        ? client.contractStartDate.toDate().toISOString().substring(0, 10)
        : client.contractStartDate || ""
    );
    setContractEndDate(
      client.contractEndDate &&
        typeof client.contractEndDate.toDate === "function"
        ? client.contractEndDate.toDate().toISOString().substring(0, 10)
        : client.contractEndDate || ""
    );
    setContractAmount(client.contractAmount || "");
    setCac(client.Metrics?.cac || "");
    setCltv(client.Metrics?.cltv || "");
    setRevenueGenerated(client.Metrics?.revenueGenerated || "");
    setOneTimeRevenue(client.Metrics?.revenueBreakdown?.oneTimeRevenue || "");
    setRecurringRevenue(
      client.Metrics?.revenueBreakdown?.recurringRevenue || ""
    );
    setStatus(client.status || "");
    setSelectedProjects(Array.isArray(client.projects) ? client.projects : []);
    setErrors({});
    setOpen(true);
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!industry) newErrors.industry = "Industry is required";
    if (!contractStartDate)
      newErrors.contractStartDate = "Contract Start Date is required";
    if (!contractEndDate)
      newErrors.contractEndDate = "Contract End Date is required";
    if (!contractAmount)
      newErrors.contractAmount = "Contract Amount is required";
    else if (parseFloat(contractAmount) <= 0)
      newErrors.contractAmount = "Contract Amount must be positive";
    if (!status) newErrors.status = "Status is required";
    if (cac && parseFloat(cac) < 0) newErrors.cac = "CAC cannot be negative";
    if (cltv && parseFloat(cltv) < 0)
      newErrors.cltv = "CLTV cannot be negative";
    if (revenueGenerated && parseFloat(revenueGenerated) < 0)
      newErrors.revenueGenerated = "Revenue Generated cannot be negative";
    if (oneTimeRevenue && parseFloat(oneTimeRevenue) < 0)
      newErrors.oneTimeRevenue = "One-Time Revenue cannot be negative";
    if (recurringRevenue && parseFloat(recurringRevenue) < 0)
      newErrors.recurringRevenue = "Recurring Revenue cannot be negative";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (validateForm()) {
      setConfirmUpdateOpen(true);
    }
  };

  // Confirm and save client updates
  const confirmUpdate = async () => {
    let newClientId = editingClient
      ? editingClient.clientId
      : generateClientId();
    let newContractId = editingClient
      ? editingClient.contractId
      : generateContractId();
    let attempts = 0;
    const maxAttempts = 10;

    if (!editingClient) {
      while (attempts < maxAttempts) {
        const isClientIdUnique = await checkUniqueId(
          "clients",
          "clientId",
          newClientId
        );
        if (isClientIdUnique) break;
        newClientId = generateClientId();
        attempts++;
      }

      attempts = 0;
      while (attempts < maxAttempts) {
        const isContractIdUnique = await checkUniqueId(
          "clients",
          "contractId",
          newContractId
        );
        if (isContractIdUnique) break;
        newContractId = generateContractId();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error("Could not generate unique IDs");
        alert(
          "Failed to generate unique Client ID or Contract ID. Please try again."
        );
        setConfirmUpdateOpen(false);
        return;
      }
    }

    // Create new client object
    const newClient = {
      clientId: newClientId,
      contractId: newContractId,
      name,
      email,
      phone,
      address,
      industry,
      contractStartDate,
      contractEndDate,
      contractAmount: parseFloat(contractAmount) || 0,
      Metrics: {
        cac: parseFloat(cac) || 0,
        cltv: parseFloat(cltv) || 0,
        revenueGenerated: parseFloat(revenueGenerated) || 0,
        revenueBreakdown: {
          oneTimeRevenue: parseFloat(oneTimeRevenue) || 0,
          recurringRevenue: parseFloat(recurringRevenue) || 0,
        },
      },
      status,
      projects: selectedProjects,
      createdAt: editingClient ? editingClient.createdAt : new Date(),
      updatedAt: new Date(),
    };

    // Save to Firestore
    try {
      if (editingClient) {
        await updateDoc(doc(db, "clients", editingClient.id), newClient);
        setClients(
          clients.map((client) =>
            client.id === editingClient.id
              ? { ...client, ...newClient }
              : client
          )
        );
      } else {
        const docRef = await addDoc(collection(db, "clients"), newClient);
        setClients([...clients, { id: docRef.id, ...newClient }]);
      }
      setConfirmUpdateOpen(false);
      handleClose();
      fetchAllData();
    } catch (error) {
      console.error("Error saving client:", error);
      alert("Failed to save client. Please try again.");
    }
  };

  // Reset form fields
  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setIndustry("");
    setContractStartDate("");
    setContractEndDate("");
    setContractAmount("");
    setCac("");
    setCltv("");
    setRevenueGenerated("");
    setOneTimeRevenue("");
    setRecurringRevenue("");
    setStatus("");
    setSelectedProjects([]);
    setEditingClient(null);
    setErrors({});
  };

  // Handle project selection change
  const handleProjectChange = (projectId) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
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

  // Main render
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
                  Client Management
                </MDTypography>
              </MDBox>
              <MDBox
                pt={3}
                pb={2}
                px={2}
                display="flex"
                flexDirection={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretch", sm: "center" }}
                gap={2}
                justifyContent="space-between"
              >
                {!isReadOnly && (
                  <Box
                    display="flex"
                    flexDirection={{ xs: "column", sm: "row" }}
                    gap={2}
                    width={{ xs: "100%", sm: "auto" }}
                  >
                    <MDButton
                      variant="gradient"
                      color={darkMode ? "dark" : "info"}
                      onClick={handleClickOpen}
                      startIcon={<AddIcon />}
                      fullWidth={{ xs: true, sm: false }}
                    >
                      Add Client
                    </MDButton>
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
                          "& .MuiSelect-select": {
                            padding: "8px",
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
                  </Box>
                )}
              </MDBox>
              <Grid container spacing={3} sx={{ padding: "16px" }}>
                {clients.map((client) => (
                  <Grid item xs={12} key={client.id}>
                    <Card
                      sx={{
                        background: darkMode
                          ? "linear-gradient(135deg, #424242 0%, #212121 100%)"
                          : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                        padding: "20px",
                        transition: "0.3s ease-in-out",
                        "&:hover": {
                          boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                          transform: "scale(1.02)",
                        },
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                      }}
                    >
                      <Box
                        sx={{
                          width: { xs: "100%", sm: "120px" },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor:
                            client.status === "Active"
                              ? "#4caf50"
                              : darkMode
                              ? "#90A4AE"
                              : "#B0BEC5",
                          borderRadius: { xs: "8px 8px 0 0", sm: "8px 0 0 8px" },
                          marginRight: { sm: "16px" },
                          marginBottom: { xs: "16px", sm: 0 },
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      >
                        <MDTypography
                          variant="body2"
                          color="white"
                          sx={{
                            fontWeight: 700,
                            fontSize: "1rem",
                            textTransform: "uppercase",
                          }}
                        >
                          {client.status}
                        </MDTypography>
                      </Box>
                      <Box
                        sx={{ flexGrow: 1, width: { xs: "100%", sm: "auto" } }}
                      >
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Client ID: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.clientId}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Name: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.name}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Email: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.email || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Phone: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.phone || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Address: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.address || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Industry: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.industry || "N/A"}
                                </span>
                              </MDTypography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Contract ID: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.contractId || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Start: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {formatTimestamp(client.contractStartDate)}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>End: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {formatTimestamp(client.contractEndDate)}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Amount: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  ${client.contractAmount || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Status: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {client.status}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Projects: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {Array.isArray(client.projects) &&
                                  client.projects.length > 0
                                    ? client.projects
                                        .map((projectId) => {
                                          const project = projects.find(
                                            (p) => p.projectId === projectId
                                          );
                                          return project
                                            ? `${project.name || "Unknown"} (${
                                                project.projectId
                                              })`
                                            : projectId;
                                        })
                                        .join(", ")
                                    : "No projects assigned"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Metrics: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  CAC: ${client.Metrics?.cac || "N/A"} | CLTV: $
                                  {client.Metrics?.cltv || "N/A"} | Revenue: $
                                  {client.Metrics?.revenueGenerated || "N/A"}
                                </span>
                              </MDTypography>
                            </Grid>
                          </Grid>
                        </CardContent>
                        {!isReadOnly && (
                          <CardActions
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 1,
                              justifyContent: { xs: "space-between", sm: "flex-end" },
                              alignItems: "center",
                              padding: "8px 16px",
                            }}
                          >
                            <MDButton
                              variant="gradient"
                              color={darkMode ? "dark" : "info"}
                              onClick={() => handleEdit(client)}
                              sx={{
                                flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
                                minWidth: { xs: "100px", sm: "100px" },
                                maxWidth: { xs: "calc(50% - 8px)", sm: "100px" },
                                padding: "8px 16px",
                                fontSize: "14px",
                              }}
                            >
                              Edit
                            </MDButton>
                          </CardActions>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Box
        sx={{
          marginLeft: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          backgroundColor: darkMode ? "#212121" : "#f3f3f3",
        }}
      >
        <Footer />
      </Box>
      {!isReadOnly && (
        <>
          <Box sx={{ ...formContainerStyle, display: open ? "block" : "none" }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <Typography sx={formHeadingStyle}>
                {editingClient ? "Edit Client" : "Add Client"}
              </Typography>
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
                placeholder="Enter Phone Number"
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Address"
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Industry*</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                style={{
                  ...formSelectStyle,
                  borderColor: errors.industry ? "red" : "#ddd",
                }}
              >
                <option value="" disabled>
                  Select Industry
                </option>
                {industries.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.industry && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.industry}
                </span>
              )}
              <label style={formLabelStyle}>Contract Start Date*</label>
              <input
                type="date"
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
                required
                style={{
                  ...formInputStyle,
                  borderColor: errors.contractStartDate ? "red" : "#ddd",
                }}
              />
              {errors.contractStartDate && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.contractStartDate}
                </span>
              )}
              <label style={formLabelStyle}>Contract End Date*</label>
              <input
                type="date"
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
                required
                style={{
                  ...formInputStyle,
                  borderColor: errors.contractEndDate ? "red" : "#ddd",
                }}
              />
              {errors.contractEndDate && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.contractEndDate}
                </span>
              )}
              <label style={formLabelStyle}>Contract Amount*</label>
              <input
                type="number"
                value={contractAmount}
                onChange={(e) => setContractAmount(e.target.value)}
                placeholder="Enter Contract Amount"
                required
                style={{
                  ...formInputStyle,
                  borderColor: errors.contractAmount ? "red" : "#ddd",
                }}
              />
              {errors.contractAmount && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.contractAmount}
                </span>
              )}
              <label style={formLabelStyle}>CAC</label>
              <input
                type="number"
                value={cac}
                onChange={(e) => setCac(e.target.value)}
                placeholder="Enter CAC"
                style={{
                  ...formInputStyle,
                  borderColor: errors.cac ? "red" : "#ddd",
                }}
              />
              {errors.cac && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.cac}
                </span>
              )}
              <label style={formLabelStyle}>CLTV</label>
              <input
                type="number"
                value={cltv}
                onChange={(e) => setCltv(e.target.value)}
                placeholder="Enter CLTV"
                style={{
                  ...formInputStyle,
                  borderColor: errors.cltv ? "red" : "#ddd",
                }}
              />
              {errors.cltv && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.cltv}
                </span>
              )}
              <label style={formLabelStyle}>Revenue Generated</label>
              <input
                type="number"
                value={revenueGenerated}
                onChange={(e) => setRevenueGenerated(e.target.value)}
                placeholder="Enter Revenue Generated"
                style={{
                  ...formInputStyle,
                  borderColor: errors.revenueGenerated ? "red" : "#ddd",
                }}
              />
              {errors.revenueGenerated && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.revenueGenerated}
                </span>
              )}
              <label style={formLabelStyle}>One-Time Revenue</label>
              <input
                type="number"
                value={oneTimeRevenue}
                onChange={(e) => setOneTimeRevenue(e.target.value)}
                placeholder="Enter One-Time Revenue"
                style={{
                  ...formInputStyle,
                  borderColor: errors.oneTimeRevenue ? "red" : "#ddd",
                }}
              />
              {errors.oneTimeRevenue && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.oneTimeRevenue}
                </span>
              )}
              <label style={formLabelStyle}>Recurring Revenue</label>
              <input
                type="number"
                value={recurringRevenue}
                onChange={(e) => setRecurringRevenue(e.target.value)}
                placeholder="Enter Recurring Revenue"
                style={{
                  ...formInputStyle,
                  borderColor: errors.recurringRevenue ? "red" : "#ddd",
                }}
              />
              {errors.recurringRevenue && (
                <span style={{ color: "red", fontSize: "12px" }}>
                  {errors.recurringRevenue}
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
              <label style={formLabelStyle}>Projects</label>
              {loadingProjects ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 2,
                  }}
                >
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Box sx={{ maxHeight: "100px", overflowY: "auto", mb: 1 }}>
                  {projects.map((project) => (
                    <Box
                      key={project.projectId}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="checkbox"
                        id={project.projectId}
                        checked={selectedProjects.includes(project.projectId)}
                        onChange={() => handleProjectChange(project.projectId)}
                        style={formCheckboxStyle}
                      />
                      <label
                        htmlFor={project.projectId}
                        style={{
                          ...formLabelStyle,
                          display: "inline",
                          marginLeft: "5px",
                          fontWeight: "normal",
                          flex: "1",
                          wordBreak: "break-word",
                        }}
                      >
                        {project.projectId} - {project.name}
                      </label>
                    </Box>
                  ))}
                </Box>
              )}
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
              Ready to update client details?
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
    </Box>
  );
};

export default ManageClient;