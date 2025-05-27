import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { db, auth } from "../manage-employee/firebase";
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from "firebase/firestore";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import * as XLSX from "xlsx";
import AddIcon from "@mui/icons-material/Add";

const statuses = ["Active", "Closed"];
const industries = ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"];

// Utility function to generate random numbers for IDs
const generateRandomNumber = () => Math.floor(1000 + Math.random() * 9000);

// Generate unique account ID
const generateAccountId = () => `ACC-${generateRandomNumber()}`;

// Check if an ID is unique in Firestore
const checkUniqueId = async (collectionName, field, value, excludeDocId = null) => {
  try {
    const q = query(collection(db, collectionName), where(field, "==", value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.every((doc) => doc.id !== excludeDocId);
  } catch (error) {
    console.error(`Error checking unique ${field}:`, error);
    return false;
  }
};

const ManageAccount = () => {
  const [open, setOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [projectList, setProjectList] = useState([]);
  const [clientList, setClientList] = useState([]);
  const [accountExpenses, setAccountExpenses] = useState({});
  const [projectExpenses, setProjectExpenses] = useState({});
  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [excelOption, setExcelOption] = useState("");
  const [errors, setErrors] = useState({});

  // Common styles adapted from ManageCustomer
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

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(collection(db, "users"), where("email", "==", user.email));
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
    userRoles.includes("ManageAccount:read") && !userRoles.includes("ManageAccount:full access");
  const hasAccess =
    userRoles.includes("ManageAccount:read") || userRoles.includes("ManageAccount:full access");

  // Fetch all data (accounts, projects, clients, expenses) in a single batch
  const fetchAllData = useCallback(async () => {
    try {
      setFetchError(null);
      setLoadingData(true);
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        setFetchError("No authenticated user. Please log in.");
        return;
      }

      // Batch fetch accounts, projects, clients, expenses
      const [accountsSnapshot, projectsSnapshot, clientsSnapshot, expensesSnapshot] =
        await Promise.all([
          getDocs(collection(db, "accounts")),
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "expenses")),
        ]);

      const accountsData = accountsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const expensesData = expensesSnapshot.docs.map((doc) => doc.data());

      // Process expenses
      const expensesMap = {};
      const projectExpensesMap = {};

      for (const account of accountsData) {
        if (account.accountId) {
          const accountExpenses = expensesData
            .filter((exp) => exp.accountId === account.accountId)
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
          expensesMap[account.accountId] = accountExpenses;

          // Calculate project expenses for this account
          const relatedExpenses = expensesData.filter(
            (exp) => exp.accountId === account.accountId && exp.projectId
          );
          relatedExpenses.forEach((exp) => {
            if (!projectExpensesMap[exp.projectId]) {
              projectExpensesMap[exp.projectId] = 0;
            }
            projectExpensesMap[exp.projectId] += Number(exp.amount) || 0;
          });
        }
      }

      // Update state
      setAccounts(accountsData);
      setProjectList(projectsData);
      setClientList(clientsData);
      setAccountExpenses(expensesMap);
      setProjectExpenses(projectExpensesMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      setFetchError("Failed to fetch data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  }, []);

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
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", blankrows: false });

        const validProjectIds = projectList.map((p) => p.id);
        const validClientIds = clientList.map((c) => c.id);

        // Normalize column names for Excel import
        const normalizeColumnName = (name) => {
          if (!name) return "";
          const cleanName = name.trim().toLowerCase().replace(/\s+/g, "");
          if (cleanName.includes("name") || cleanName.includes("accountname")) return "Name";
          if (cleanName.includes("industry")) return "Industry";
          if (cleanName.includes("project") || cleanName.includes("projects")) return "Projects";
          if (cleanName.includes("client") || cleanName.includes("clients")) return "Clients";
          if (cleanName.includes("status")) return "Status";
          if (cleanName.includes("notes")) return "Notes";
          return name;
        };

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeColumnName(key)] = row[key];
          });
          return normalizedRow;
        });

        for (const account of normalizedData) {
          let newAccountId = generateAccountId();
          let attempts = 0;
          const maxAttempts = 10;

          // Ensure unique account ID
          while (attempts < maxAttempts) {
            const isAccountIdUnique = await checkUniqueId("accounts", "accountId", newAccountId);
            if (isAccountIdUnique) break;
            newAccountId = generateAccountId();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error("Could not generate unique ID for account:", account["Name"]);
            alert("Failed to generate unique ID for some accounts. Please try again.");
            return;
          }

          // Validate required fields
          if (
            !account["Name"]?.trim() ||
            !account["Industry"]?.trim() ||
            !account["Status"]?.trim()
          ) {
            console.error("Missing required fields in account:", account["Name"]);
            alert(
              `Missing required fields for account ${
                account["Name"] || "unknown"
              }. Required: Name, Industry, Status.`
            );
            return;
          }

          // Validate industry
          const normalizedIndustry = account["Industry"].trim();
          if (!industries.map((i) => i.toLowerCase()).includes(normalizedIndustry.toLowerCase())) {
            console.error("Invalid industry for account:", account["Name"]);
            alert(`Invalid industry "${account["Industry"]}" for account ${account["Name"]}.`);
            return;
          }

          // Validate status
          const normalizedStatus = account["Status"].trim();
          if (!statuses.map((s) => s.toLowerCase()).includes(normalizedStatus.toLowerCase())) {
            console.error("Invalid status for account:", account["Name"]);
            alert(`Invalid status "${account["Status"]}" for account ${account["Name"]}.`);
            return;
          }

          // Process projects
          let projectIds = [];
          if (account["Projects"]) {
            projectIds = account["Projects"]
              .toString()
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id && validProjectIds.includes(id));
          }

          // Process clients
          let clientIds = [];
          if (account["Clients"]) {
            clientIds = account["Clients"]
              .toString()
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id && validClientIds.includes(id));
          }

          // Calculate financial metrics
          const currentExpenses = accountExpenses[newAccountId] || 0;
          const totalBudget = projectList
            .filter((project) => projectIds.includes(project.id))
            .reduce((sum, project) => sum + (Number(project.financialMetrics?.budget) || 0), 0);
          const revenue = totalBudget - currentExpenses;
          const profitMargin = totalBudget > 0 ? (revenue / totalBudget) * 100 : 0;

          // Create new account object
          const newAccount = {
            accountId: newAccountId,
            name: account["Name"].trim(),
            industry: normalizedIndustry,
            revenue: revenue.toFixed(2),
            expenses: currentExpenses,
            profitMargin: profitMargin.toFixed(2),
            projects: projectIds,
            clients: clientIds,
            status: normalizedStatus,
            notes: account["Notes"]?.toString().trim() || "",
          };

          // Save account to Firestore
          try {
            const docRef = await addDoc(collection(db, "accounts"), newAccount);
            setAccounts((prev) => [...prev, { id: docRef.id, ...newAccount }]);
          } catch (error) {
            console.error("Error adding account from Excel:", error);
            alert(`Failed to add account ${account["Name"] || "unknown"}. Error: ${error.message}`);
            return;
          }
        }
        alert("Accounts imported successfully!");
        fetchAllData();
      } catch (error) {
        console.error("Error processing Excel file:", error);
        alert(
          "Failed to process Excel file. Please ensure it contains the required fields (Name, Industry, Status) and is in a valid format (.xlsx, .xls, .csv)."
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
    const exportData = accounts.map((account) => ({
      Name: account.name,
      Industry: account.industry,
      Revenue: account.revenue || 0,
      Expenses: accountExpenses[account.accountId] || 0,
      "Profit Margin": account.profitMargin || 0,
      Projects: Array.isArray(account.projects)
        ? account.projects
            .map((projectId) => {
              const project = projectList.find((p) => p.id === projectId);
              return project ? project.name || project.id : projectId;
            })
            .join(", ")
        : "",
      Clients: Array.isArray(account.clients)
        ? account.clients
            .map((clientId) => {
              const client = clientList.find((c) => c.id === clientId);
              return client ? client.name || client.id : clientId;
            })
            .join(", ")
        : "",
      Status: account.status,
      Notes: account.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accounts");
    XLSX.writeFile(workbook, "accounts_export.xlsx");
  };

  // Handle dummy Excel download
  const handleDownloadDummyExcel = () => {
    const dummyData = [
      {
        Name: "",
        Industry: "",
        Revenue: "",
        Expenses: "",
        "Profit Margin": "",
        Projects: "",
        Clients: "",
        Status: "",
        Notes: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accounts");
    XLSX.writeFile(workbook, "accounts_dummy.xlsx");
  };

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setName(account.name || "");
    setIndustry(account.industry || "");
    setProjects(Array.isArray(account.projects) ? account.projects : []);
    setClients(Array.isArray(account.clients) ? account.clients : []);
    setStatus(account.status || "");
    setNotes(account.notes || "");
    setErrors({});
    setOpen(true);
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!industry) newErrors.industry = "Industry is required";
    if (!status) newErrors.status = "Status is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setConfirmUpdateOpen(true);
    }
  };

  const confirmUpdate = async () => {
    let accountId = editingAccount ? editingAccount.accountId : generateAccountId();
    let attempts = 0;
    const maxAttempts = 10;

    if (!editingAccount) {
      while (attempts < maxAttempts) {
        const isAccountIdUnique = await checkUniqueId("accounts", "accountId", accountId);
        if (isAccountIdUnique) break;
        accountId = generateAccountId();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error("Could not generate unique account ID");
        alert("Failed to generate unique Account ID. Please try again.");
        setConfirmUpdateOpen(false);
        return;
      }
    }

    const currentExpenses = accountExpenses[accountId] || 0;
    const totalBudget = projectList
      .filter((project) => projects.includes(project.id))
      .reduce((sum, project) => sum + (Number(project.financialMetrics?.budget) || 0), 0);
    const revenue = totalBudget - currentExpenses;
    const profitMargin = totalBudget > 0 ? (revenue / totalBudget) * 100 : 0;

    const newAccount = {
      accountId,
      name,
      industry,
      revenue: revenue.toFixed(2),
      expenses: currentExpenses,
      profitMargin: profitMargin.toFixed(2),
      projects,
      clients,
      status,
      notes,
    };

    try {
      if (editingAccount) {
        await updateDoc(doc(db, "accounts", editingAccount.id), newAccount);
        setAccounts(
          accounts.map((acc) => (acc.id === editingAccount.id ? { ...acc, ...newAccount } : acc))
        );
      } else {
        const docRef = await addDoc(collection(db, "accounts"), newAccount);
        setAccounts([...accounts, { id: docRef.id, ...newAccount }]);
      }
      setConfirmUpdateOpen(false);
      handleClose();
      fetchAllData();
    } catch (error) {
      console.error("Error saving account:", error);
      alert("Failed to save account. Please try again.");
    }
  };

  const resetForm = () => {
    setName("");
    setIndustry("");
    setProjects([]);
    setClients([]);
    setStatus("");
    setNotes("");
    setEditingAccount(null);
    setErrors({});
  };

  // Handle checkbox selection for projects and clients
  const handleSelectionChange = (id, type) => {
    if (type === "project") {
      if (projectList.some((project) => project.id === id)) {
        setProjects((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
      }
    } else if (type === "client") {
      if (clientList.some((client) => client.id === id)) {
        setClients((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
      }
    }
  };

  // Render loading state
  if (loadingRoles || loadingData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>Loading...</MDTypography>
      </Box>
    );
  }

  // Render access denied
  if (!hasAccess) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          You do not have permission to view this page.
        </MDTypography>
      </Box>
    );
  }

  // Render fetch error
  if (fetchError) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <MDTypography variant="h6" color="error">{fetchError}</MDTypography>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: darkMode ? "#212121" : "#f3f3f3", minHeight: "100vh" }}>
      <DashboardNavbar
        absolute
        light={!darkMode}
        sx={{
          backgroundColor: darkMode ? "rgba(33, 33, 33, 0.9)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 1100,
          padding: "0 16px",
          minHeight: "60px",
          top: "8px",
          left: { xs: "0", md: miniSidenav ? "80px" : "250px" },
          width: { xs: "100%", md: miniSidenav ? "calc(100% - 80px)" : "calc(100% - 250px)" },
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
                Account Management
              </MDTypography>
            </MDBox>
            {!isReadOnly && (
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
                    sx={{ textTransform: "none", fontWeight: "medium" }}
                  >
                    Add Account
                  </MDButton>
                  <select
                    value={excelOption}
                    onChange={handleExcelOptionChange}
                    style={formSelectStyle}
                  >
                    <option value="" disabled>Select Excel Option</option>
                    <option value="upload">Upload Excel</option>
                    <option value="download">Download Excel</option>
                    <option value="downloadDummy">Download Dummy Excel</option>
                  </select>
                  <input
                    id="file-upload"
                    type="file"
                    hidden
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                  />
                </Box>
              </MDBox>
            )}
            <Grid container spacing={3} sx={{ padding: "16px" }}>
              {accounts.length === 0 ? (
                <Grid item xs={12}>
                  <MDTypography variant="body2" color={darkMode ? "white" : "textSecondary"}>
                    No accounts available.
                  </MDTypography>
                </Grid>
              ) : (
                accounts.map((account) => (
                  <Grid item xs={12} key={account.id}>
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
                          backgroundColor: account.status === "Active" ? "#4caf50" : "#F44336",
                          borderRadius: { xs: "8px 8px 0 0", sm: "8px 0 0 8px" },
                          marginRight: { sm: "16px" },
                          marginBottom: { xs: "16px", sm: 0 },
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      >
                        <MDTypography
                          variant="body2"
                          color="white"
                          sx={{ fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}
                        >
                          {account.status}
                        </MDTypography>
                      </Box>
                      <Box sx={{ flexGrow: 1, width: { xs: "100%", sm: "auto" } }}>
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Account ID: </span>
                                <span style={{ fontWeight: "bold" }}>{account.accountId}</span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Name: </span>
                                <span style={{ fontWeight: "bold" }}>{account.name}</span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Industry: </span>
                                <span style={{ fontWeight: "bold" }}>{account.industry}</span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Revenue: </span>
                                <span style={{ fontWeight: "bold" }}>${account.revenue || 0}</span>
                              </MDTypography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Expenses: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  ${accountExpenses[account.accountId] || 0}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Profit Margin: </span>
                                <span style={{ fontWeight: "bold" }}>{account.profitMargin || 0}%</span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Projects: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {Array.isArray(account.projects) && account.projects.length > 0
                                    ? account.projects
                                        .map((projectId) => {
                                          const project = projectList.find((p) => p.id === projectId);
                                          const projectExpense = projectExpenses[projectId] || 0;
                                          return project
                                            ? `${project.name || project.id} ($${projectExpense})`
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
                                <span>Clients: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {Array.isArray(account.clients) && account.clients.length > 0
                                    ? account.clients
                                        .map((clientId) => {
                                          const client = clientList.find((c) => c.id === clientId);
                                          return client ? client.name || client.id : clientId;
                                        })
                                        .join(", ")
                                    : "No clients assigned"}
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
                              onClick={() => handleEdit(account)}
                              sx={{
                                flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
                                minWidth: { xs: "100px", sm: "100px" },
                                maxWidth: { xs: "calc(50% - 8px)", sm: "100px" },
                                padding: "8px 16px",
                                fontSize: "14px",
                              }}
                            >
                              <Icon fontSize="medium">edit</Icon> Edit
                            </MDButton>
                          </CardActions>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
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
            <form onSubmit={handleSubmit}>
              <Typography sx={formHeadingStyle}>
                {editingAccount ? "Edit Account" : "Add Account"}
              </Typography>
              <label style={formLabelStyle}>Name*</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Name"
                required
                style={{ ...formInputStyle, borderColor: errors.name ? "red" : "#ddd" }}
              />
              {errors.name && (
                <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
                  {errors.name}
                </span>
              )}
              <label style={formLabelStyle}>Industry*</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                style={{ ...formSelectStyle, borderColor: errors.industry ? "red" : "#ddd" }}
              >
                <option value="" disabled>Select Industry</option>
                {industries.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {errors.industry && (
                <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
                  {errors.industry}
                </span>
              )}
              <label style={formLabelStyle}>Projects</label>
              <Box sx={{ maxHeight: "100px", overflowY: "auto", mb: 1 }}>
                {loadingData ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : projectList.length === 0 ? (
                  <Typography sx={{ fontSize: "12px", color: "#555" }}>
                    No projects available
                  </Typography>
                ) : (
                  projectList.map((project) => (
                    <Box
                      key={project.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="checkbox"
                        id={project.id}
                        checked={projects.includes(project.id)}
                        onChange={() => handleSelectionChange(project.id, "project")}
                        style={formCheckboxStyle}
                      />
                      <label
                        htmlFor={project.id}
                        style={{
                          ...formLabelStyle,
                          display: "inline",
                          marginLeft: "5px",
                          fontWeight: "normal",
                          flex: "1",
                          wordBreak: "break-word",
                        }}
                      >
                        {project.name || project.id || "Unknown"}
                      </label>
                    </Box>
                  ))
                )}
              </Box>
              <label style={formLabelStyle}>Clients</label>
              <Box sx={{ maxHeight: "100px", overflowY: "auto", mb: 1 }}>
                {loadingData ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : clientList.length === 0 ? (
                  <Typography sx={{ fontSize: "12px", color: "#555" }}>
                    No clients available
                  </Typography>
                ) : (
                  clientList.map((client) => (
                    <Box
                      key={client.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="checkbox"
                        id={client.id}
                        checked={clients.includes(client.id)}
                        onChange={() => handleSelectionChange(client.id, "client")}
                        style={formCheckboxStyle}
                      />
                      <label
                        htmlFor={client.id}
                        style={{
                          ...formLabelStyle,
                          display: "inline",
                          marginLeft: "5px",
                          fontWeight: "normal",
                          flex: "1",
                          wordBreak: "break-word",
                        }}
                      >
                        {client.name || client.id || "Unknown"}
                      </label>
                    </Box>
                  ))
                )}
              </Box>
              <label style={formLabelStyle}>Status*</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                style={{ ...formSelectStyle, borderColor: errors.status ? "red" : "#ddd" }}
              >
                <option value="" disabled>Select Status</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.status && (
                <span style={{ color: "red", fontSize: "12px", display: "block", marginBottom: "10px" }}>
                  {errors.status}
                </span>
              )}
              <label style={formLabelStyle}>Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter Notes"
                style={formInputStyle}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button type="button" onClick={handleClose} style={formButtonStyle}>Cancel</button>
                <button type="submit" style={formButtonStyle}>Save</button>
              </Box>
            </form>
          </Box>
          <Box sx={{ ...formContainerStyle, display: confirmUpdateOpen ? "block" : "none" }}>
            <Typography sx={formHeadingStyle}>Ready to update account details?</Typography>
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
                style={{ ...formButtonStyle, backgroundColor: "#1976d2" }}
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

export default ManageAccount;