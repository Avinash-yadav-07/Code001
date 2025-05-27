import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Grid,
  Card,
  Typography,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import DataTable from "examples/Tables/DataTable";
import { db, auth } from "../manage-employee/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import Autocomplete from "@mui/material/Autocomplete";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const earningCategories = [
  "Project Revenue",
  "Service Revenue",
  "Product Sales",
  "Subscription Revenue",
  "Licensing Revenue",
  "Commission Income",
  "Advertising Revenue",
  "Consulting Fees",
  "Investment Income",
  "Rental or Leasing Income",
];

const Option = ({ id, onClick, children }) => (
  <li key={id} onClick={onClick}>
    {children}
  </li>
);

Option.propTypes = {
  id: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const renderOption = ({ onClick }, option, label) => (
  <Option id={option.id} onClick={onClick}>
    {label(option)}
  </Option>
);

renderOption.propTypes = {
  onClick: PropTypes.func.isRequired,
};

const ManageEarnings = () => {
  const [earnings, setEarnings] = useState([]);
  const [selectedEarning, setSelectedEarning] = useState(null);
  const [open, setOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [reference, setReference] = useState(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [excelOption, setExcelOption] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  // Styles aligned with ManageEmployee
  const formContainerStyle = {
    backgroundColor: darkMode ? "#424242" : "#fff",
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

  const formLabelStyle = {
    fontSize: "14px",
    display: "block",
    width: "100%",
    marginTop: "6px",
    marginBottom: "4px",
    textAlign: "left",
    color: darkMode ? "#aaaaaa" : "#555",
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
    color: darkMode ? "#ffffff" : "#327c35",
    margin: "10px 0",
  };

  // Check if an ID is unique in Firestore
  const checkUniqueId = async (collectionName, field, value) => {
    try {
      const q = query(
        collection(db, collectionName),
        where(field, "==", value)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error(`Error checking unique ${field}:`, error);
      return false;
    }
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

    const user = auth.currentUser;
    if (!user) {
      toast.error("No authenticated user");
      return;
    }

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

        const validAccountIds = accounts.map((a) => a.accountId);

        const normalizeColumnName = (name) => {
          if (!name) return "";
          const cleanName = name.trim().toLowerCase().replace(/\s+/g, "");
          if (cleanName.includes("earningid")) return "Earning ID";
          if (cleanName.includes("category")) return "Category";
          if (cleanName.includes("amount")) return "Amount";
          if (cleanName.includes("date")) return "Date";
          if (cleanName.includes("referenceid")) return "Reference ID";
          if (cleanName.includes("accountid")) return "Account ID";
          return name;
        };

        const normalizedData = jsonData.map((row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[normalizeColumnName(key)] = row[key];
          });
          return normalizedRow;
        });

        for (const earning of normalizedData) {
          let newEarningId = generateEarningId();
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts) {
            const isEarningIdUnique = await checkUniqueId(
              "earnings",
              "earningId",
              newEarningId
            );
            if (isEarningIdUnique) break;
            newEarningId = generateEarningId();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            console.error("Could not generate unique earning ID");
            toast.error(
              "Failed to generate unique earning ID. Please try again."
            );
            return;
          }

          if (
            !earning["Category"]?.trim() ||
            !earning["Amount"] ||
            !earning["Date"] ||
            !earning["Account ID"]?.trim()
          ) {
            console.error(
              "Missing required fields in earning:",
              earning["Earning ID"]
            );
            toast.error(
              `Missing required fields for earning ${
                earning["Earning ID"] || "unknown"
              }. Required: Category, Amount, Date, Account ID.`
            );
            return;
          }

          const normalizedCategory = earning["Category"].trim();
          if (
            !earningCategories
              .map((c) => c.toLowerCase())
              .includes(normalizedCategory.toLowerCase())
          ) {
            console.error(
              "Invalid category for earning:",
              earning["Earning ID"]
            );
            toast.error(
              `Invalid category "${earning["Category"]}" for earning ${
                earning["Earning ID"] || "unknown"
              }.`
            );
            return;
          }

          const amount = parseFloat(earning["Amount"]);
          if (isNaN(amount) || amount <= 0) {
            console.error("Invalid amount for earning:", earning["Earning ID"]);
            toast.error(
              `Amount must be positive for earning ${
                earning["Earning ID"] || "unknown"
              }.`
            );
            return;
          }

          let earningDate = earning["Date"];
          if (earningDate instanceof Date) {
            earningDate = earningDate.toISOString().substring(0, 10);
          } else {
            earningDate = new Date(earning["Date"]?.toString());
            if (isNaN(earningDate.getTime())) {
              console.error("Invalid date for earning:", earning["Earning ID"]);
              toast.error(
                `Invalid date "${earning["Date"]}" for earning ${
                  earning["Earning ID"] || "unknown"
                }.`
              );
              return;
            }
            earningDate = earningDate.toISOString().substring(0, 10);
          }

          const accountId = earning["Account ID"]?.trim();
          if (!validAccountIds.includes(accountId)) {
            console.error(
              "Invalid account ID for earning:",
              earning["Earning ID"]
            );
            toast.error(
              `Invalid account ID "${earning["Account ID"]}" for earning ${
                earning["Earning ID"] || "unknown"
              }.`
            );
            return;
          }

          const newEarning = {
            earningId: newEarningId,
            category: normalizedCategory,
            amount: amount,
            date: Timestamp.fromDate(new Date(earningDate)),
            referenceId: earning["Reference ID"]?.toString().trim() || null,
            accountId: accountId,
            createdBy: user.uid,
          };

          try {
            await addDoc(collection(db, "earnings"), newEarning);
          } catch (error) {
            console.error("Error adding earning from Excel:", error);
            toast.error(
              `Failed to add earning ${
                earning["Earning ID"] || "unknown"
              }. Error: ${error.message}`
            );
            return;
          }
        }
        toast.success("Earnings imported successfully!");
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast.error(
          "Failed to process Excel file. Please ensure it contains the required fields (Category, Amount, Date, Account ID) and is in a valid format (.xlsx, .xls, .csv)."
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
    const exportData = earnings.map((earning) => ({
      "Earning ID": earning.earningId || earning.id,
      Category: earning.category || "N/A",
      Amount: Number(earning.amount || 0).toFixed(2),
      Date: earning.date || "N/A",
      "Reference ID": earning.referenceId || "N/A",
      "Account ID": earning.accountId || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Earnings");
    XLSX.writeFile(workbook, "earnings_export.xlsx");
  };

  const handleDownloadDummyExcel = () => {
    const dummyData = [
      {
        "Earning ID": "",
        Category: "",
        Amount: "",
        Date: "",
        "Reference ID": "",
        "Account ID": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(dummyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Earnings");
    XLSX.writeFile(workbook, "earnings_dummy.xlsx");
  };

  const generateEarningId = () =>
    `E-${Math.floor(10000 + Math.random() * 90000)}`;

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
    userRoles.includes("ManageEarning:read") &&
    !userRoles.includes("ManageEarning:full access");
  const hasAccess =
    userRoles.includes("ManageEarning:read") ||
    userRoles.includes("ManageEarning:full access");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user");
      return;
    }

    let earningsQuery = query(
      collection(db, "earnings"),
      where("accountId", "!=", null)
    );
    if (isReadOnly) {
      earningsQuery = query(earningsQuery, where("createdBy", "==", user.uid));
    }

    const unsubscribe = onSnapshot(
      earningsQuery,
      (snapshot) => {
        const earningsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate().toLocaleDateString() || "N/A",
          };
        });
        setEarnings(earningsData);
      },
      (error) => {
        console.error("Error fetching earnings:", error);
      }
    );
    return () => unsubscribe();
  }, [isReadOnly]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        return;
      }

      const clientsQuery = query(
        collection(db, "clients"),
        where("status", "==", "Active")
      );

      const accountsQuery = query(
        collection(db, "accounts"),
        where("status", "==", "Active")
      );

      const projectsQuery = query(
        collection(db, "projects"),
        where("status", "==", "Active")
      );

      const [clientsSnapshot, accountsSnapshot, projectsSnapshot] =
        await Promise.all([
          getDocs(clientsQuery),
          getDocs(accountsQuery),
          getDocs(projectsQuery),
        ]);

      setClients(
        clientsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setAccounts(
        accountsSnapshot.docs.map((doc) => ({
          id: doc.id,
          accountId: doc.data().accountId,
          name: doc.data().name || "Unknown",
          ...doc.data(),
        }))
      );
      setProjects(
        projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (error) {
      console.error("Error fetching reference data:", error);
    }
  }, []);

  useEffect(() => {
    if (!loadingRoles) {
      fetchReferenceData();
    }
  }, [loadingRoles, fetchReferenceData]);

  useEffect(() => {
    setReference(null);
  }, [category]);

  const validateForm = () => {
    const errors = {};
    if (!category) errors.category = "Category is required";
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      errors.amount = "Valid amount is required";
    if (!selectedAccount) errors.account = "Account is required";
    if (!date) errors.date = "Date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEarning = async () => {
    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    const newEarning = {
      earningId: generateEarningId(),
      category,
      referenceId:
        reference && typeof reference === "object"
          ? reference.projectId ||
            reference.clientId ||
            reference.accountId ||
            reference.name
          : reference || "N/A",
      amount: Number(amount) || 0,
      date: date ? Timestamp.fromDate(new Date(date)) : Timestamp.now(),
      accountId: selectedAccount?.accountId,
      createdBy: auth.currentUser?.uid || "unknown",
    };

    try {
      await addDoc(collection(db, "earnings"), newEarning);
      toast.success("Earning added successfully!");
      handleClose();
    } catch (error) {
      console.error("Error adding earning:", error);
      toast.error("Failed to add earning. Please try again.");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCategory("");
    setReference(null);
    setAmount("");
    setDate("");
    setSelectedAccount(null);
    setFormErrors({});
  };

  const EarningDetails = ({ label, value }) => (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography
        display="block"
        variant="caption"
        color="text"
        fontWeight="medium"
      >
        {label}
      </MDTypography>
      <MDTypography
        variant="caption"
        sx={{ color: darkMode ? "white" : "inherit" }}
      >
        {value}
      </MDTypography>
    </MDBox>
  );

  EarningDetails.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  };

  const AmountBadge = ({ amount }) => (
    <MDBox ml={-1}>
      <MDBadge
        badgeContent={`$${Number(amount).toFixed(2)}`}
        color="success"
        variant="gradient"
        size="sm"
      />
    </MDBox>
  );

  AmountBadge.propTypes = {
    amount: PropTypes.number.isRequired,
  };

  // Pagination logic
  const totalItems = earnings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEarnings = earnings.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const tableData = {
    columns: [
      { Header: "Earning ID", accessor: "earningId", align: "left" },
      { Header: "Category", accessor: "category", align: "left" },
      { Header: "Reference", accessor: "reference", align: "left" },
      { Header: "Account", accessor: "account", align: "left" },
      { Header: "Amount", accessor: "amount", align: "center" },
      { Header: "Date", accessor: "date", align: "center" },
      { Header: "Actions", accessor: "actions", align: "center" },
    ],
    rows: paginatedEarnings.map((earning) => ({
      earningId: (
        <MDTypography
          variant="caption"
          fontWeight="medium"
          sx={{ color: darkMode ? "white" : "inherit" }}
        >
          {earning.earningId || earning.id}
        </MDTypography>
      ),
      category: (
        <MDTypography
          variant="caption"
          fontWeight="medium"
          sx={{ color: darkMode ? "white" : "inherit" }}
        >
          {earning.category || "N/A"}
        </MDTypography>
      ),
      reference: (
        <EarningDetails
          label="Reference"
          value={earning.referenceId || "N/A"}
        />
      ),
      account: (
        <MDTypography
          variant="caption"
          fontWeight="medium"
          sx={{ color: darkMode ? "white" : "inherit" }}
        >
          {earning.accountId || "N/A"}
        </MDTypography>
      ),
      amount: <AmountBadge amount={Number(earning.amount) || 0} />,
      date: (
        <MDTypography
          variant="caption"
          color="text"
          fontWeight="medium"
          sx={{ color: darkMode ? "white" : "inherit" }}
        >
          {earning.date}
        </MDTypography>
      ),
      actions: (
        <MDBox display="flex" justifyContent="center">
          <Button
            variant="gradient"
            color="info"
            onClick={() => {
              setSelectedEarning(earning);
              setViewDetailsOpen(true);
            }}
            sx={{ mb: 2 }}
          >
            <VisibilityIcon />
          </Button>
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
                  Earnings Management
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
                      onClick={() => setOpen(true)}
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
                      Add Earning
                    </Button>
                    <FormControl sx={{ minWidth: "150px" }}>
                      <InputLabel id="excel-options-label">Excel Options</InputLabel>
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
                        <MenuItem value="upload">Upload Excel</MenuItem>
                        <MenuItem value="download">Download Excel</MenuItem>
                        <MenuItem value="downloadDummy">Download Dummy Excel</MenuItem>
                      </Select>
                    </FormControl>
                    <input
                      id="file-upload"
                      type="file"
                      hidden
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                    />
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
        <Box sx={{ ...formContainerStyle, display: open ? "block" : "none" }}>
          <Typography sx={formHeadingStyle}>Add Earning</Typography>
          <form onSubmit={(e) => { e.preventDefault(); handleAddEarning(); }}>
            <label style={formLabelStyle}>Category*</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{
                ...formSelectStyle,
                borderColor: formErrors.category ? "red" : "#ddd",
              }}
            >
              <option value="" disabled>Select Category</option>
              {earningCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {formErrors.category && (
              <span style={{ color: "red", fontSize: "10px" }}>{formErrors.category}</span>
            )}
            {category && (
              <>
                {category === "Project Revenue" && (
                  <>
                    <label style={formLabelStyle}>Project</label>
                    <Autocomplete
                      fullWidth
                      options={projects}
                      getOptionLabel={(option) =>
                        option.projectId || option.name || "N/A"
                      }
                      value={reference}
                      onChange={(e, newValue) => setReference(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select Project"
                          variant="outlined"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              fontSize: "12px",
                              padding: "6px",
                              borderRadius: "3px",
                              "& fieldset": {
                                borderColor: formErrors.project ? "red" : "#ddd",
                              },
                            },
                          }}
                        />
                      )}
                      renderOption={(props, option, { selected }) => (
                        <li {...props}>
                          <Box display="flex" alignItems="center">
                            {selected && <CheckIcon sx={{ mr: 1 }} />}
                            {option.projectId || option.name || "N/A"}
                          </Box>
                        </li>
                      )}
                    />
                  </>
                )}
                {(category === "Service Revenue" ||
                  category === "Subscription Revenue" ||
                  category === "Licensing Revenue" ||
                  category === "Consulting Fees") && (
                  <>
                    <label style={formLabelStyle}>Client</label>
                    <Autocomplete
                      fullWidth
                      options={clients}
                      getOptionLabel={(option) =>
                        option.clientId || option.name || "N/A"
                      }
                      value={reference}
                      onChange={(e, newValue) => setReference(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select Client"
                          variant="outlined"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              fontSize: "12px",
                              padding: "6px",
                              borderRadius: "3px",
                              "& fieldset": {
                                borderColor: formErrors.client ? "red" : "#ddd",
                              },
                            },
                          }}
                        />
                      )}
                      renderOption={(props, option, { selected }) => (
                        <li {...props}>
                          <Box display="flex" alignItems="center">
                            {selected && <CheckIcon sx={{ mr: 1 }} />}
                            {option.clientId || option.name || "N/A"}
                          </Box>
                        </li>
                      )}
                    />
                  </>
                )}
                {(category === "Commission Income" ||
                  category === "Advertising Revenue" ||
                  category === "Rental or Leasing Income") && (
                  <>
                    <label style={formLabelStyle}>Account</label>
                    <Autocomplete
                      fullWidth
                      options={accounts}
                      getOptionLabel={(option) =>
                        `${option.name} (${option.accountId})` || "N/A"
                      }
                      value={reference}
                      onChange={(e, newValue) => setReference(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select Account"
                          variant="outlined"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              fontSize: "12px",
                              padding: "6px",
                              borderRadius: "3px",
                              "& fieldset": {
                                borderColor: formErrors.account ? "red" : "#ddd",
                              },
                            },
                          }}
                        />
                      )}
                      renderOption={(props, option, { selected }) => (
                        <li {...props}>
                          <Box display="flex" alignItems="center">
                            {selected && <CheckIcon sx={{ mr: 1 }} />}
                            {`${option.name} (${option.accountId})` || "N/A"}
                          </Box>
                        </li>
                      )}
                    />
                  </>
                )}
                {(category === "Product Sales" ||
                  category === "Investment Income") && (
                  <>
                    <label style={formLabelStyle}>Reference Details</label>
                    <input
                      type="text"
                      value={reference || ""}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Enter reference details"
                      style={formInputStyle}
                    />
                  </>
                )}
              </>
            )}
            <label style={formLabelStyle}>Account*</label>
            <Autocomplete
              fullWidth
              options={accounts}
              getOptionLabel={(option) =>
                `${option.name} (${option.accountId})` || "N/A"
              }
              value={selectedAccount}
              onChange={(e, newValue) => setSelectedAccount(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select Account"
                  variant="outlined"
                  required
                  error={!!formErrors.account}
                  helperText={formErrors.account}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontSize: "12px",
                      padding: "6px",
                      borderRadius: "3px",
                      "& fieldset": {
                        borderColor: formErrors.account ? "red" : "#ddd",
                      },
                    },
                    "& .Mui-root": {
                      marginBottom: "10px",
                    },
                  }}
                />
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Box display="flex" alignItems="center">
                    {selected && <CheckIcon sx={{ mr: 1 }} />}
                    {`${option.name} (${option.accountId})` || "N/A"}
                  </Box>
                </li>
              )}
            />
            <label style={formLabelStyle}>Amount*</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              required
              style={{
                ...formInputStyle,
                borderColor: formErrors.amount ? "red" : "#ddd",
              }}
            />
            {formErrors.amount && (
              <span style={{ color: "red", fontSize: "10px" }}>{formErrors.amount}</span>
            )}
            <label style={formLabelStyle}>Date*</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{
                ...formInputStyle,
                borderColor: formErrors.date ? "red" : "#ddd",
              }}
            />
            {formErrors.date && (
              <span style={{ color: "red", fontSize: "10px" }}>{formErrors.date}</span>
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
      )}
      <Box
        sx={{
          ...formContainerStyle,
          display: viewDetailsOpen ? "block" : "none",
        }}
      >
        <Typography sx={{ ...formHeadingStyle, mb: 2 }}>
          Earning Details
        </Typography>
        {selectedEarning && (
          <Grid container spacing={2}>
            {[
              { label: "Earning ID", value: selectedEarning.earningId || "N/A" },
              { label: "Category", value: selectedEarning.category || "N/A" },
              { label: "Reference", value: selectedEarning.referenceId || "N/A" },
              { label: "Account ID", value: selectedEarning.accountId || "N/A" },
              {
                label: "Amount",
                value: `$${Number(selectedEarning.amount || 0).toFixed(2)}`,
              },
              { label: "Date", value: selectedEarning.date || "N/A" },
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

export default ManageEarnings;