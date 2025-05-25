import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Grid,
  Button,
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
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Icon from "@mui/material/Icon";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useMaterialUIController } from "context";
import { Navigate } from "react-router-dom";

const ManageCustomer = () => {
  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [npsUpdateOpen, setNpsUpdateOpen] = useState(false);
  const [csatUpdateOpen, setCsatUpdateOpen] = useState(false);
  const [chsUpdateOpen, setChsUpdateOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [supportCustomer, setSupportCustomer] = useState(null);
  const [upgradeCustomer, setUpgradeCustomer] = useState(null);
  const [cancelCustomer, setCancelCustomer] = useState(null);
  const [updateMetricCustomer, setUpdateMetricCustomer] = useState(null);
  const [dateFilterType, setDateFilterType] = useState("all");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("");
  const [projectIds, setProjectIds] = useState([]);
  const [signUpDate, setSignUpDate] = useState(null);
  const [nps, setNps] = useState("");
  const [npsDate, setNpsDate] = useState(null);
  const [csat, setCsat] = useState("");
  const [csatDate, setCsatDate] = useState(null);
  const [chs, setChs] = useState("");
  const [chsDate, setChsDate] = useState(null);
  const [cltv, setCltv] = useState("");
  const [feature, setFeature] = useState("");
  const [supportProjectIds, setSupportProjectIds] = useState([]);
  const [issueDescription, setIssueDescription] = useState("");
  const [numberOfIssues, setNumberOfIssues] = useState("");
  const [complaintDate, setComplaintDate] = useState(null);
  const [resolvedDate, setResolvedDate] = useState(null);
  const [responseChannel, setResponseChannel] = useState([]);
  const [upgradeSubscriptionTier, setUpgradeSubscriptionTier] =
    useState("premium");
  const [planUpgradeDate, setPlanUpgradeDate] = useState(null);
  const [cancellationDate, setCancellationDate] = useState(null);
  const [churnReason, setChurnReason] = useState("");
  const [projects, setProjects] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [latestMetrics, setLatestMetrics] = useState({});

  const [controller] = useMaterialUIController();
  const { miniSidenav, darkMode } = controller;

  const responseChannelOptions = ["Email", "Chat", "Call"];
  const churnReasonOptions = ["Price", "Service", "Features", "Other", "None"];
  const featureOptions = ["Core", "Advanced", "Integrations"];

  // Common styles adapted from provided App.css
  const formContainerStyle = {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)",
    padding: "10px 20px",
    width: "90%",
    maxWidth: "500px",
    maxHeight: "80vh", // Limit form height to 80% of viewport height
    overflowY: "auto", // Enable vertical scrolling
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
    padding: "6px", // Reduced padding for compactness
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "3px",
    fontSize: "12px",
    marginBottom: "10px", // Reduced margin
  };

  const formSelectStyle = {
    ...formInputStyle,
    padding: "8px",
    borderRadius: "5px",
    height: "32px", // Fixed height to ensure dropdown visibility
  };

  const formCheckboxStyle = {
    display: "inline",
    width: "auto", // Adjusted for better alignment
    marginRight: "5px",
  };

  const formLabelStyle = {
    fontSize: "14px", // Slightly smaller font
    display: "block",
    width: "100%",
    marginTop: "6px", // Reduced margin
    marginBottom: "4px",
    textAlign: "left",
    color: "#555",
    fontWeight: "bold",
  };

  const formButtonStyle = {
    padding: "10px", // Smaller buttons
    borderRadius: "10px",
    margin: "10px",
    border: "none",
    color: "white",
    cursor: "pointer",
    backgroundColor: "#4caf50",
    width: "40%",
    fontSize: "14px",
  };

  const formTextareaStyle = {
    resize: "none",
    width: "98%",
    minHeight: "80px", // Reduced height
    maxHeight: "120px",
    padding: "6px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "3px",
    fontSize: "12px",
    marginBottom: "10px",
  };

  const formHeadingStyle = {
    fontSize: "large", // Smaller heading
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
            setUserRoles(querySnapshot.docs[0].data().roles || []);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
        }
      }
      setLoadingRoles(false);
    };

    fetchUserRoles();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [customerSnapshot, metricsSnapshot, projectSnapshot] =
          await Promise.all([
            getDocs(collection(db, "customers")),
            getDocs(collection(db, "customerMetrics")),
            getDocs(collection(db, "projects")),
          ]);

        const customersData = customerSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate() || new Date(doc.data().createdAt),
          signUpDate: doc.data().signUpDate?.toDate() || null,
        }));

        const metricsData = metricsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          metricDate:
            doc.data().metricDate?.toDate() || new Date(doc.data().metricDate),
        }));

        const projectsData = projectSnapshot.docs.map((doc) => ({
          id: doc.id,
          projectId: doc.data().projectId,
          name: doc.data().name || "Unnamed Project",
        }));

        const latestMetricsData = {};
        customersData.forEach((customer) => {
          const customerMetrics = metricsData.filter(
            (metric) => metric.customerId === customer.customerId
          );
          const latestNps = customerMetrics
            .filter((m) => m.metricType === "nps")
            .sort((a, b) => b.metricDate - a.metricDate)[0];
          const latestCsat = customerMetrics
            .filter((m) => m.metricType === "csat")
            .sort((a, b) => b.metricDate - a.metricDate)[0];
          const latestChs = customerMetrics
            .filter((m) => m.metricType === "chs")
            .sort((a, b) => b.metricDate - a.metricDate)[0];
          latestMetricsData[customer.customerId] = {
            nps: latestNps
              ? { value: latestNps.value, date: latestNps.metricDate }
              : null,
            csat: latestCsat
              ? { value: latestCsat.value, date: latestCsat.metricDate }
              : null,
            chs: latestChs
              ? { value: latestChs.value, date: latestChs.metricDate }
              : null,
          };
        });

        if (isMounted) {
          setCustomers(customersData);
          setFilteredCustomers(customersData);
          setLatestMetrics(latestMetricsData);
          setProjects(projectsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let filtered = [...customers];
    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const now = new Date();
    switch (dateFilterType) {
      case "today":
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return (
            customerDate.getDate() === now.getDate() &&
            customerDate.getMonth() === now.getMonth() &&
            customerDate.getFullYear() === now.getFullYear()
          );
        });
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return customerDate >= weekStart && customerDate <= now;
        });
        break;
      case "month":
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return (
            customerDate.getMonth() === now.getMonth() &&
            customerDate.getFullYear() === now.getFullYear()
          );
        });
        break;
      case "3months":
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return customerDate >= threeMonthsAgo && customerDate <= now;
        });
        break;
      case "year":
        filtered = filtered.filter((customer) => {
          const customerDate = new Date(customer.createdAt);
          return customerDate.getFullYear() === now.getFullYear();
        });
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          filtered = filtered.filter((customer) => {
            const customerDate = new Date(customer.createdAt);
            return (
              customerDate >= customStartDate && customerDate <= customEndDate
            );
          });
        }
        break;
      default:
        break;
    }
    setFilteredCustomers(filtered);
  }, [customers, searchTerm, dateFilterType, customStartDate, customEndDate]);

  const handleClickOpen = () => {
    setOpen(true);
    resetForm();
  };

  const handleSupportOpen = (customer) => {
    setSupportCustomer(customer);
    setSupportProjectIds(customer.projectIds || []);
    setSupportOpen(true);
    resetSupportForm();
  };

  const handleUpgradeOpen = (customer) => {
    setUpgradeCustomer(customer);
    setPlanUpgradeDate(null);
    setUpgradeSubscriptionTier("premium");
    setUpgradeOpen(true);
  };

  const handleCancelOpen = (customer) => {
    setCancelCustomer(customer);
    setCancellationDate(null);
    setChurnReason("");
    setCancelOpen(true);
  };

  const handleNpsUpdateOpen = (customer) => {
    setUpdateMetricCustomer(customer);
    setNps("");
    setNpsDate(null);
    setNpsUpdateOpen(true);
  };

  const handleCsatUpdateOpen = (customer) => {
    setUpdateMetricCustomer(customer);
    setCsat("");
    setCsatDate(null);
    setCsatUpdateOpen(true);
  };

  const handleChsUpdateOpen = (customer) => {
    setUpdateMetricCustomer(customer);
    setChs("");
    setChsDate(null);
    setChsUpdateOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSupportClose = () => {
    setSupportOpen(false);
    resetSupportForm();
  };

  const handleUpgradeClose = () => {
    setUpgradeOpen(false);
    setUpgradeCustomer(null);
  };

  const handleCancelClose = () => {
    setCancelOpen(false);
    setCancelCustomer(null);
  };

  const handleNpsUpdateClose = () => {
    setNpsUpdateOpen(false);
    setUpdateMetricCustomer(null);
    setNps("");
    setNpsDate(null);
  };

  const handleCsatUpdateClose = () => {
    setCsatUpdateOpen(false);
    setUpdateMetricCustomer(null);
    setCsat("");
    setCsatDate(null);
  };

  const handleChsUpdateClose = () => {
    setChsUpdateOpen(false);
    setUpdateMetricCustomer(null);
    setChs("");
    setChsDate(null);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setCustomerName(customer.customerName || "");
    setEmail(customer.email || "");
    setPhone(customer.phone || "");
    setAddress(customer.address || "");
    setStatus(customer.status || "");
    setSubscriptionTier(customer.subscriptionTier || "");
    setProjectIds(customer.projectIds || []);
    setSignUpDate(customer.signUpDate || null);
    setFeature(customer.feature || "");
    setCltv(customer.cltv || "");
    setNps("");
    setNpsDate(null);
    setCsat("");
    setCsatDate(null);
    setChs("");
    setChsDate(null);
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName || !email || !status || !subscriptionTier || !feature) {
      alert(
        "Customer Name, Email, Status, Subscription Tier, and Feature are required."
      );
      return;
    }
    if ((nps && !npsDate) || (npsDate && !nps)) {
      alert("Both NPS value and NPS Date are required if one is provided.");
      return;
    }
    if ((csat && !csatDate) || (csatDate && !csat)) {
      alert("Both CSAT value and CSAT Date are required if one is provided.");
      return;
    }
    if ((chs && !chsDate) || (chsDate && !chs)) {
      alert("Both CHS value and CHS Date are required if one is provided.");
      return;
    }

    const newCustomer = {
      customerId: editingCustomer
        ? editingCustomer.customerId
        : generateCustomerId(),
      customerName,
      email,
      phone,
      address,
      status,
      subscriptionTier,
      projectIds: projectIds.length > 0 ? projectIds : [],
      signUpDate: signUpDate || new Date(),
      feature,
      cltv: Number(cltv) || 0,
      createdAt: new Date(),
    };

    try {
      if (editingCustomer) {
        await updateDoc(doc(db, "customers", editingCustomer.id), newCustomer);
        setCustomers(
          customers.map((cust) =>
            cust.id === editingCustomer.id
              ? { id: cust.id, ...newCustomer }
              : cust
          )
        );
      } else {
        const docRef = await addDoc(collection(db, "customers"), newCustomer);
        setCustomers([...customers, { id: docRef.id, ...newCustomer }]);
      }

      const metricsToSave = [];
      if (nps && npsDate && Number(nps) >= 0 && Number(nps) <= 100) {
        metricsToSave.push({
          customerId: newCustomer.customerId,
          metricType: "nps",
          value: Number(nps),
          metricDate: npsDate,
          createdAt: new Date(),
        });
      }
      if (csat && csatDate && Number(csat) >= 0 && Number(csat) <= 100) {
        metricsToSave.push({
          customerId: newCustomer.customerId,
          metricType: "csat",
          value: Number(csat),
          metricDate: csatDate,
          createdAt: new Date(),
        });
      }
      if (chs && chsDate) {
        metricsToSave.push({
          customerId: newCustomer.customerId,
          metricType: "chs",
          value: Number(chs),
          metricDate: chsDate,
          createdAt: new Date(),
        });
      }

      if (metricsToSave.length > 0) {
        await Promise.all(
          metricsToSave.map((metric) =>
            addDoc(collection(db, "customerMetrics"), metric)
          )
        );
      }

      await refreshMetrics();
      handleClose();
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  const refreshMetrics = async () => {
    const metricsSnapshot = await getDocs(collection(db, "customerMetrics"));
    const metricsData = metricsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      metricDate:
        doc.data().metricDate?.toDate() || new Date(doc.data().metricDate),
    }));

    const latestMetricsData = {};
    customers.forEach((customer) => {
      const customerMetrics = metricsData.filter(
        (metric) => metric.customerId === customer.customerId
      );
      const latestNps = customerMetrics
        .filter((m) => m.metricType === "nps")
        .sort((a, b) => b.metricDate - a.metricDate)[0];
      const latestCsat = customerMetrics
        .filter((m) => m.metricType === "csat")
        .sort((a, b) => b.metricDate - a.metricDate)[0];
      const latestChs = customerMetrics
        .filter((m) => m.metricType === "chs")
        .sort((a, b) => b.metricDate - a.metricDate)[0];
      latestMetricsData[customer.customerId] = {
        nps: latestNps
          ? { value: latestNps.value, date: latestNps.metricDate }
          : null,
        csat: latestCsat
          ? { value: latestCsat.value, date: latestCsat.metricDate }
          : null,
        chs: latestChs
          ? { value: latestChs.value, date: latestChs.metricDate }
          : null,
      };
    });
    setLatestMetrics(latestMetricsData);
  };

  const handleNpsUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!nps || !npsDate) {
      alert("Both NPS value and NPS Date are required.");
      return;
    }
    if (Number(nps) < 0 || Number(nps) > 100) {
      alert("NPS must be between 0 and 100.");
      return;
    }
    if (!updateMetricCustomer) {
      alert("No customer selected for NPS update.");
      return;
    }

    try {
      await addDoc(collection(db, "customerMetrics"), {
        customerId: updateMetricCustomer.customerId,
        metricType: "nps",
        value: Number(nps),
        metricDate: npsDate,
        createdAt: new Date(),
      });
      await refreshMetrics();
      handleNpsUpdateClose();
    } catch (error) {
      console.error("Error saving NPS:", error);
    }
  };

  const handleCsatUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!csat || !csatDate) {
      alert("Both CSAT value and CSAT Date are required.");
      return;
    }
    if (Number(csat) < 0 || Number(csat) > 100) {
      alert("CSAT must be between 0 and 100.");
      return;
    }
    if (!updateMetricCustomer) {
      alert("No customer selected for CSAT update.");
      return;
    }

    try {
      await addDoc(collection(db, "customerMetrics"), {
        customerId: updateMetricCustomer.customerId,
        metricType: "csat",
        value: Number(csat),
        metricDate: csatDate,
        createdAt: new Date(),
      });
      await refreshMetrics();
      handleCsatUpdateClose();
    } catch (error) {
      console.error("Error saving CSAT:", error);
    }
  };

  const handleChsUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!chs || !chsDate) {
      alert("Both CHS value and CHS Date are required.");
      return;
    }
    if (!updateMetricCustomer) {
      alert("No customer selected for CHS update.");
      return;
    }

    try {
      await addDoc(collection(db, "customerMetrics"), {
        customerId: updateMetricCustomer.customerId,
        metricType: "chs",
        value: Number(chs),
        metricDate: chsDate,
        createdAt: new Date(),
      });
      await refreshMetrics();
      handleChsUpdateClose();
    } catch (error) {
      console.error("Error saving CHS:", error);
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (
      !supportProjectIds.length ||
      !issueDescription ||
      !numberOfIssues ||
      !complaintDate
    ) {
      alert(
        "Project IDs, Issue Description, Number of Issues, and Complaint Date are required."
      );
      return;
    }
    if (!supportCustomer) {
      alert("No customer selected for support ticket.");
      return;
    }

    try {
      await addDoc(collection(db, "supportTickets"), {
        customerId: supportCustomer.customerId,
        projectIds: supportProjectIds,
        issueDescription,
        numberOfIssues: Number(numberOfIssues),
        complaintDate,
        resolvedDate,
        responseChannel:
          responseChannel.length > 0 ? responseChannel : ["None"],
        createdAt: new Date(),
      });
      handleSupportClose();
    } catch (error) {
      console.error("Error saving support ticket:", error);
    }
  };

  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    if (!planUpgradeDate) {
      alert("Plan Upgrade Date is required.");
      return;
    }
    if (!upgradeCustomer) {
      alert("No customer selected for upgrade.");
      return;
    }

    try {
      await Promise.all([
        addDoc(collection(db, "upgrades"), {
          customerId: upgradeCustomer.customerId,
          subscriptionTier: upgradeSubscriptionTier,
          planUpgradeDate,
          projectIds: upgradeCustomer.projectIds || [],
          createdAt: new Date(),
        }),
        updateDoc(doc(db, "customers", upgradeCustomer.id), {
          subscriptionTier: upgradeSubscriptionTier,
          status: "active",
        }),
      ]);
      setCustomers(
        customers.map((cust) =>
          cust.id === upgradeCustomer.id
            ? {
                ...cust,
                subscriptionTier: upgradeSubscriptionTier,
                status: "active",
              }
            : cust
        )
      );
      handleUpgradeClose();
    } catch (error) {
      console.error("Error saving upgrade:", error);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellationDate || !churnReason) {
      alert("Cancellation Date and Churn Reason are required.");
      return;
    }
    if (!cancelCustomer) {
      alert("No customer selected for cancellation.");
      return;
    }

    try {
      await Promise.all([
        addDoc(collection(db, "cancellations"), {
          customerId: cancelCustomer.customerId,
          cancellationDate,
          churnReason,
          createdAt: new Date(),
        }),
        updateDoc(doc(db, "customers", cancelCustomer.id), {
          status: "inactive",
          churnReason,
        }),
      ]);
      setCustomers(
        customers.map((cust) =>
          cust.id === cancelCustomer.id
            ? { ...cust, status: "inactive", churnReason }
            : cust
        )
      );
      handleCancelClose();
    } catch (error) {
      console.error("Error saving cancellation:", error);
    }
  };

  const generateCustomerId = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  const resetForm = () => {
    setCustomerName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setStatus("");
    setSubscriptionTier("");
    setProjectIds([]);
    setSignUpDate(null);
    setNps("");
    setNpsDate(null);
    setCsat("");
    setCsatDate(null);
    setChs("");
    setChsDate(null);
    setCltv("");
    setFeature("");
    setEditingCustomer(null);
  };

  const resetSupportForm = () => {
    setIssueDescription("");
    setNumberOfIssues("");
    setComplaintDate(null);
    setResolvedDate(null);
    setResponseChannel([]);
  };

  const handleProjectIdChange = (id) => {
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleResponseChannelChange = (channel) => {
    setResponseChannel((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
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
        <MDTypography variant="h6" color={darkMode ? "white" : "textPrimary"}>
          Loading...
        </MDTypography>
      </Box>
    );
  }

  if (
    !userRoles.includes("ManageCustomer:read") &&
    !userRoles.includes("ManageCustomer:full access")
  ) {
    return <Navigate to="/unauthorized" />;
  }

  const isReadOnly =
    userRoles.includes("ManageCustomer:read") &&
    !userRoles.includes("ManageCustomer:full access");

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
                  Customer Management
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
                <Box
                  display="flex"
                  flexDirection={{ xs: "column", sm: "row" }}
                  gap={2}
                  width={{ xs: "100%", sm: "auto" }}
                >
                  {!isReadOnly && (
                    <MDButton
                      variant="gradient"
                      color={darkMode ? "dark" : "info"}
                      onClick={handleClickOpen}
                      fullWidth={{ xs: true, sm: false }}
                    >
                      Add Customer
                    </MDButton>
                  )}
                  <input
                    type="text"
                    placeholder="Search by Name or Email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={formInputStyle}
                  />
                </Box>
                <Box
                  display="flex"
                  flexDirection={{ xs: "column", sm: "row" }}
                  gap={2}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  width={{ xs: "100%", sm: "auto" }}
                >
                  <select
                    value={dateFilterType}
                    onChange={(e) => setDateFilterType(e.target.value)}
                    style={formSelectStyle}
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {dateFilterType === "custom" && (
                    <Button
                      variant="outlined"
                      onClick={() => setDatePickerOpen(true)}
                      sx={{
                        height: 40,
                        color: darkMode ? "white" : "black",
                        borderColor: darkMode ? "white" : "black",
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      Choose Dates
                    </Button>
                  )}
                </Box>
              </MDBox>

              <Box
                sx={{
                  ...formContainerStyle,
                  display: datePickerOpen ? "block" : "none",
                }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setDatePickerOpen(false);
                  }}
                >
                  <Typography sx={formHeadingStyle}>
                    Select Date Range
                  </Typography>
                  <label style={formLabelStyle}>Start Date*</label>
                  <input
                    type="date"
                    value={
                      customStartDate
                        ? customStartDate.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setCustomStartDate(
                        e.target.value ? new Date(e.target.value) : null
                      )
                    }
                    required
                    style={formInputStyle}
                  />
                  <label style={formLabelStyle}>End Date*</label>
                  <input
                    type="date"
                    value={
                      customEndDate
                        ? customEndDate.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setCustomEndDate(
                        e.target.value ? new Date(e.target.value) : null
                      )
                    }
                    required
                    style={formInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    style={formButtonStyle}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={formButtonStyle}>
                    Apply
                  </button>
                </form>
              </Box>

              <Grid container spacing={3} sx={{ padding: "16px" }}>
                {filteredCustomers.map((customer) => (
                  <Grid item xs={12} key={customer.id}>
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
                            customer.subscriptionTier === "premium"
                              ? "#4caf50"
                              : darkMode
                              ? "#90A4AE"
                              : "#B0BEC5",
                          borderRadius: {
                            xs: "8px 8px 0 0",
                            sm: "8px 0 0 8px",
                          },
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
                          {customer.subscriptionTier === "premium"
                            ? "Premium"
                            : "Free"}
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
                                <span>Customer ID: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.customerId}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Name: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.customerName}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Email: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.email}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Phone: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.phone || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Address: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.address || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Status: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.status}
                                </span>
                              </MDTypography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Subscription Tier: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.subscriptionTier}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Feature: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.feature || "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Project IDs: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.projectIds?.join(", ") || "None"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>Sign-Up Date: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.signUpDate?.toLocaleDateString() ||
                                    "N/A"}
                                </span>
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                color={darkMode ? "white" : "textSecondary"}
                                sx={{ mb: 1 }}
                              >
                                <span>CLTV: </span>
                                <span style={{ fontWeight: "bold" }}>
                                  {customer.cltv}
                                </span>
                              </MDTypography>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: { xs: "column", sm: "row" },
                                  gap: 1,
                                  mt: 1,
                                  flexWrap: "wrap",
                                  justifyContent: {
                                    xs: "flex-start",
                                    sm: "flex-end",
                                  },
                                }}
                              >
                                <MDButton
                                  variant="outlined"
                                  color={darkMode ? "white" : "info"}
                                  size="small"
                                  onClick={() => handleNpsUpdateOpen(customer)}
                                  sx={{
                                    minWidth: { xs: "100%", sm: "120px" },
                                    textAlign: "left",
                                  }}
                                >
                                  <Icon fontSize="small">update</Icon>
                                  NPS:{" "}
                                  {latestMetrics[customer.customerId]?.nps
                                    ?.value ?? "N/A"}
                                  {latestMetrics[customer.customerId]?.nps?.date
                                    ? ` (${latestMetrics[
                                        customer.customerId
                                      ].nps.date.toLocaleDateString()})`
                                    : ""}
                                </MDButton>
                                <MDButton
                                  variant="outlined"
                                  color={darkMode ? "white" : "info"}
                                  size="small"
                                  onClick={() => handleCsatUpdateOpen(customer)}
                                  sx={{
                                    minWidth: { xs: "100%", sm: "120px" },
                                    textAlign: "left",
                                  }}
                                >
                                  <Icon fontSize="small">update</Icon>
                                  CSAT:{" "}
                                  {latestMetrics[customer.customerId]?.csat
                                    ?.value ?? "N/A"}
                                  {latestMetrics[customer.customerId]?.csat
                                    ?.date
                                    ? ` (${latestMetrics[
                                        customer.customerId
                                      ].csat.date.toLocaleDateString()})`
                                    : ""}
                                </MDButton>
                                <MDButton
                                  variant="outlined"
                                  color={darkMode ? "white" : "info"}
                                  size="small"
                                  onClick={() => handleChsUpdateOpen(customer)}
                                  sx={{
                                    minWidth: { xs: "100%", sm: "120px" },
                                    textAlign: "left",
                                  }}
                                >
                                  <Icon fontSize="small">update</Icon>
                                  CHS:{" "}
                                  {latestMetrics[customer.customerId]?.chs
                                    ?.value ?? "N/A"}
                                  {latestMetrics[customer.customerId]?.chs?.date
                                    ? ` (${latestMetrics[
                                        customer.customerId
                                      ].chs.date.toLocaleDateString()})`
                                    : ""}
                                </MDButton>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                        {!isReadOnly && (
                          <CardActions
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 1,
                              justifyContent: {
                                xs: "space-between",
                                sm: "flex-end",
                              },
                              alignItems: "center",
                              padding: "8px 16px",
                            }}
                          >
                            <MDButton
                              variant="gradient"
                              color={darkMode ? "dark" : "info"}
                              onClick={() => handleEdit(customer)}
                              sx={{
                                flex: {
                                  xs: "1 1 calc(50% - 4px)",
                                  sm: "0 0 auto",
                                },
                                minWidth: { xs: "auto", sm: "100px" },
                                maxWidth: { xs: "50%", sm: "auto" },
                              }}
                            >
                              <Icon fontSize="medium">edit</Icon> Edit
                            </MDButton>
                            <MDButton
                              variant="gradient"
                              color={darkMode ? "dark" : "success"}
                              onClick={() => handleSupportOpen(customer)}
                              sx={{
                                flex: {
                                  xs: "1 1 calc(50% - 4px)",
                                  sm: "0 0 auto",
                                },
                                minWidth: { xs: "auto", sm: "100px" },
                                maxWidth: { xs: "50%", sm: "auto" },
                              }}
                            >
                              <Icon fontSize="medium">support</Icon> Support
                            </MDButton>
                            {customer.subscriptionTier === "free" && (
                              <MDButton
                                variant="gradient"
                                color={darkMode ? "dark" : "warning"}
                                onClick={() => handleUpgradeOpen(customer)}
                                sx={{
                                  flex: {
                                    xs: "1 1 calc(50% - 4px)",
                                    sm: "0 0 auto",
                                  },
                                  minWidth: { xs: "auto", sm: "100px" },
                                  maxWidth: { xs: "50%", sm: "auto" },
                                }}
                              >
                                <Icon fontSize="medium">upgrade</Icon> Upgrade
                              </MDButton>
                            )}
                            <MDButton
                              variant="gradient"
                              color="error"
                              onClick={() => handleCancelOpen(customer)}
                              sx={{
                                flex: {
                                  xs: "1 1 calc(50% - 4px)",
                                  sm: "0 0 auto",
                                },
                                minWidth: { xs: "auto", sm: "100px" },
                                maxWidth: { xs: "50%", sm: "auto" },
                              }}
                            >
                              <Icon fontSize="medium">cancel</Icon> Cancel
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
            <form onSubmit={handleSubmit}>
              <Typography sx={formHeadingStyle}>
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </Typography>
              <label style={formLabelStyle}>Customer Name*</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter Customer Name"
                required
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Email*</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                required
                style={formInputStyle}
              />
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
              <label style={formLabelStyle}>Status*</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                style={formSelectStyle}
              >
                <option value="" disabled>
                  Select Status
                </option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <label style={formLabelStyle}>Subscription Tier*</label>
              <select
                value={subscriptionTier}
                onChange={(e) => setSubscriptionTier(e.target.value)}
                required
                style={formSelectStyle}
              >
                <option value="" disabled>
                  Select Tier
                </option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
              <label style={formLabelStyle}>Feature*</label>
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                required
                style={formSelectStyle}
              >
                <option value="" disabled>
                  Select Feature
                </option>
                {featureOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <label style={formLabelStyle}>Project IDs</label>
              <Box sx={{ maxHeight: "100px", overflowY: "auto", mb: 1 }}>
                {projects.map((project) => (
                  <div
                    key={project.projectId}
                    style={{ textAlign: "left", marginBottom: "4px" }}
                  >
                    <input
                      type="checkbox"
                      id={project.projectId}
                      checked={projectIds.includes(project.projectId)}
                      onChange={() => handleProjectIdChange(project.projectId)}
                      style={formCheckboxStyle}
                    />
                    <label
                      htmlFor={project.projectId}
                      style={{
                        ...formLabelStyle,
                        display: "inline",
                        marginLeft: "5px",
                        fontWeight: "normal",
                      }}
                    >
                      {project.projectId} - {project.name}
                    </label>
                  </div>
                ))}
              </Box>
              <label style={formLabelStyle}>Sign-Up Date</label>
              <input
                type="date"
                value={signUpDate ? signUpDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setSignUpDate(
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Net Promoter Score (0-100)</label>
              <input
                type="number"
                value={nps}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 0 && value <= 100) setNps(e.target.value);
                }}
                placeholder="Enter NPS (0-100)"
                min="0"
                max="100"
                style={formInputStyle}
              />
              <label style={formLabelStyle}>NPS Date{!!nps && "*"}</label>
              <input
                type="date"
                value={npsDate ? npsDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setNpsDate(e.target.value ? new Date(e.target.value) : null)
                }
                required={!!nps}
                style={formInputStyle}
              />
              <label style={formLabelStyle}>
                Customer Satisfaction Score (0-100)
              </label>
              <input
                type="number"
                value={csat}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 0 && value <= 100) setCsat(e.target.value);
                }}
                placeholder="Enter CSAT (0-100)"
                min="0"
                max="100"
                style={formInputStyle}
              />
              <label style={formLabelStyle}>CSAT Date{!!csat && "*"}</label>
              <input
                type="date"
                value={csatDate ? csatDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setCsatDate(e.target.value ? new Date(e.target.value) : null)
                }
                required={!!csat}
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Customer Health Score</label>
              <input
                type="number"
                value={chs}
                onChange={(e) => setChs(e.target.value)}
                placeholder="Enter CHS"
                style={formInputStyle}
              />
              <label style={formLabelStyle}>CHS Date{!!chs && "*"}</label>
              <input
                type="date"
                value={chsDate ? chsDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setChsDate(e.target.value ? new Date(e.target.value) : null)
                }
                required={!!chs}
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Customer Lifetime Value</label>
              <input
                type="number"
                value={cltv}
                onChange={(e) => setCltv(e.target.value)}
                placeholder="Enter CLTV"
                style={formInputStyle}
              />
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
              display: supportOpen ? "block" : "none",
            }}
          >
            <form onSubmit={handleSupportSubmit}>
              <Typography sx={formHeadingStyle}>
                Create Support Ticket for{" "}
                {supportCustomer?.customerName || "Customer"}
              </Typography>
              <label style={formLabelStyle}>Project IDs*</label>
              <input
                type="text"
                value={supportProjectIds.join(", ") || "None"}
                readOnly
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Issue Description*</label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the issue"
                required
                style={formTextareaStyle}
              />
              <label style={formLabelStyle}>Number of Issues*</label>
              <input
                type="number"
                value={numberOfIssues}
                onChange={(e) => setNumberOfIssues(e.target.value)}
                placeholder="Enter Number of Issues"
                required
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Complaint Date*</label>
              <input
                type="datetime-local"
                value={
                  complaintDate ? complaintDate.toISOString().slice(0, 16) : ""
                }
                onChange={(e) =>
                  setComplaintDate(
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
                required
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Resolved Date</label>
              <input
                type="datetime-local"
                value={
                  resolvedDate ? resolvedDate.toISOString().slice(0, 16) : ""
                }
                onChange={(e) =>
                  setResolvedDate(
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Response Channel</label>
              {responseChannelOptions.map((channel) => (
                <div
                  key={channel}
                  style={{ textAlign: "left", marginBottom: "4px" }}
                >
                  <input
                    type="checkbox"
                    id={channel}
                    checked={responseChannel.includes(channel)}
                    onChange={() => handleResponseChannelChange(channel)}
                    style={formCheckboxStyle}
                  />
                  <label
                    htmlFor={channel}
                    style={{
                      ...formLabelStyle,
                      display: "inline",
                      marginLeft: "5px",
                      fontWeight: "normal",
                    }}
                  >
                    {channel}
                  </label>
                </div>
              ))}
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={handleSupportClose}
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
              display: upgradeOpen ? "block" : "none",
            }}
          >
            <form onSubmit={handleUpgradeSubmit}>
              <Typography sx={formHeadingStyle}>
                Upgrade Subscription for{" "}
                {upgradeCustomer?.customerName || "Customer"}
              </Typography>
              <label style={formLabelStyle}>Subscription Tier*</label>
              <select
                value={upgradeSubscriptionTier}
                onChange={(e) => setUpgradeSubscriptionTier(e.target.value)}
                required
                style={formSelectStyle}
              >
                <option value="premium">Premium</option>
              </select>
              <label style={formLabelStyle}>Plan Upgrade Date*</label>
              <input
                type="date"
                value={
                  planUpgradeDate
                    ? planUpgradeDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setPlanUpgradeDate(
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
                required
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Project IDs</label>
              <input
                type="text"
                value={upgradeCustomer?.projectIds.join(", ") || "None"}
                readOnly
                style={formInputStyle}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={handleUpgradeClose}
                  style={formButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={formButtonStyle}>
                  Upgrade
                </button>
              </Box>
            </form>
          </Box>

          <Box
            sx={{
              ...formContainerStyle,
              display: cancelOpen ? "block" : "none",
            }}
          >
            <form onSubmit={handleCancelSubmit}>
              <Typography sx={formHeadingStyle}>
                Cancel Subscription for{" "}
                {cancelCustomer?.customerName || "Customer"}
              </Typography>
              <label style={formLabelStyle}>Cancellation Date*</label>
              <input
                type="date"
                value={
                  cancellationDate
                    ? cancellationDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setCancellationDate(
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
                required
                style={formInputStyle}
              />
              <label style={formLabelStyle}>Churn Reason*</label>
              <select
                value={churnReason}
                onChange={(e) => setChurnReason(e.target.value)}
                required
                style={formSelectStyle}
              >
                <option value="" disabled>
                  Select Reason
                </option>
                {churnReasonOptions.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={handleCancelClose}
                  style={formButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={formButtonStyle}>
                  Confirm Cancellation
                </button>
              </Box>
            </form>
          </Box>

          <Box
            sx={{
              ...formContainerStyle,
              display: npsUpdateOpen ? "block" : "none",
            }}
          >
            <form onSubmit={handleNpsUpdateSubmit}>
              <Typography sx={formHeadingStyle}>
                Update NPS for{" "}
                {updateMetricCustomer?.customerName || "Customer"}
              </Typography>
              <label style={formLabelStyle}>Net Promoter Score (0-100)*</label>
              <input
                type="number"
                value={nps}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 0 && value <= 100) setNps(e.target.value);
                }}
                placeholder="Enter NPS (0-100)"
                min="0"
                max="100"
                required
                style={formInputStyle}
              />
              <label style={formLabelStyle}>NPS Date*</label>
              <input
                type="date"
                value={npsDate ? npsDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setNpsDate(e.target.value ? new Date(e.target.value) : null)
                }
                required
                style={formInputStyle}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={handleNpsUpdateClose}
                  style={formButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={formButtonStyle}>
                  Update
                </button>
              </Box>
            </form>
          </Box>

          <Box
            sx={{
              ...formContainerStyle,
              display: csatUpdateOpen ? "block" : "none",
            }}
          >
            <form onSubmit={handleCsatUpdateSubmit}>
              <Typography sx={formHeadingStyle}>
                Update CSAT for{" "}
                {updateMetricCustomer?.customerName || "Customer"}
              </Typography>
              <label style={formLabelStyle}>
                Customer Satisfaction Score (0-100)*
              </label>
              <input
                type="number"
                value={csat}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 0 && value <= 100) setCsat(e.target.value);
                }}
                placeholder="Enter CSAT (0-100)"
                min="0"
                max="100"
                required
                style={formInputStyle}
              />
              <label style={formLabelStyle}>CSAT Date*</label>
              <input
                type="date"
                value={csatDate ? csatDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setCsatDate(e.target.value ? new Date(e.target.value) : null)
                }
                required
                style={formInputStyle}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={handleCsatUpdateClose}
                  style={formButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={formButtonStyle}>
                  Update
                </button>
              </Box>
            </form>
          </Box>

          <Box
            sx={{
              ...formContainerStyle,
              display: chsUpdateOpen ? "block" : "none",
            }}
          >
            <form onSubmit={handleChsUpdateSubmit}>
              <Typography sx={formHeadingStyle}>
                Update CHS for{" "}
                {updateMetricCustomer?.customerName || "Customer"}
              </Typography>
              <label style={formLabelStyle}>Customer Health Score*</label>
              <input
                type="number"
                value={chs}
                onChange={(e) => setChs(e.target.value)}
                placeholder="Enter CHS"
                required
                style={formInputStyle}
              />
              <label style={formLabelStyle}>CHS Date*</label>
              <input
                type="date"
                value={chsDate ? chsDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setChsDate(e.target.value ? new Date(e.target.value) : null)
                }
                required
                style={formInputStyle}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={handleChsUpdateClose}
                  style={formButtonStyle}
                >
                  Cancel
                </button>
                <button type="submit" style={formButtonStyle}>
                  Update
                </button>
              </Box>
            </form>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ManageCustomer;
