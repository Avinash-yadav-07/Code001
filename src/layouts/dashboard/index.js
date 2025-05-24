import React,{useState, useEffect, useMemo, useCallback } from "react";
import {
  Grid,
  Collapse,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  CircularProgress,
  Typography,
} from "@mui/material";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import PieChart from "examples/Charts/PieChart";
import ReportsBarChart from "examples/Charts/BarCharts/ReportsBarChart";
import DataTable from "examples/Tables/DataTable";
import {
  fetchExpensesByCategory,
  fetchEarningsByCategory,
  fetchExpenses,
  fetchEarnings,
} from "../../utils/fetchData";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SettingsIcon from "@mui/icons-material/Settings";
import PropTypes from "prop-types"; // Corrected import
import { toast } from "react-toastify";
import { debounce } from "lodash";
import "./styles.css";

// Custom Checkbox Component (Made accessible and Material-UI compliant)
const CustomCheckbox = React.memo(({ checked, onChange, label }) => (
  <FormControlLabel
    control={
      <Checkbox
        checked={checked}
        onChange={onChange}
        color="primary"
        inputProps={{ "aria-label": label }}
      />
    }
    label=""
    sx={{ margin: 0 }}
  />
));

CustomCheckbox.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
};

// PropTypes for row.original in tableColumns
const rowOriginalPropTypes = PropTypes.shape({
  isSelected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  category: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onCategoryClick: PropTypes.func.isRequired,
});

// Table columns
const tableColumns = [
  {
    Header: "Select",
    accessor: "select",
    Cell: ({ row }) => (
      <CustomCheckbox
        checked={row.original.isSelected}
        onChange={() => row.original.onToggle(row.original.category)}
        label={`Select ${row.original.category}`}
      />
    ),
  },
  { Header: "Category", accessor: "category" },
  { Header: "Amount", accessor: "amount" },
  {
    Header: "Description",
    accessor: "description",
    Cell: ({ row }) => (
      <IconButton
        aria-label={`Expand ${row.original.category} details`}
        size="small"
        onClick={() => row.original.onCategoryClick(row.original.category)}
      >
        {row.original.isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
      </IconButton>
    ),
  },
];

// PropTypes for Cell render functions
tableColumns[0].Cell.propTypes = {
  row: PropTypes.shape({
    original: rowOriginalPropTypes,
  }).isRequired,
};

tableColumns[3].Cell.propTypes = {
  row: PropTypes.shape({
    original: rowOriginalPropTypes,
  }).isRequired,
};
const detailsColumns = [
  { Header: "Type", accessor: "type" },
  { Header: "Category", accessor: "category" },
  { Header: "Date", accessor: "date" },
  { Header: "Amount", accessor: "amount" },
  { Header: "Account ID", accessor: "accountId" },
  { Header: "Description", accessor: "description" },
];

function Dashboard() {
  const [data, setData] = useState({ expenses: [], earnings: [], isLoading: true, error: null });
  const [selectedChartData, setSelectedChartData] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [activeCard, setActiveCard] = useState("expenses");
  const [dashboardLevel, setDashboardLevel] = useState("Organization Level");
  const [accountId, setAccountId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [accountAnchorEl, setAccountAnchorEl] = useState(null);
  const [runwayAnchorEl, setRunwayAnchorEl] = useState(null);
  const [dateFilterAnchorEl, setDateFilterAnchorEl] = useState(null);
  const [selectedRunwayMonths, setSelectedRunwayMonths] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDetailCategories, setSelectedDetailCategories] = useState({});

  // Menu handlers
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleAccountMenuOpen = (event) => setAccountAnchorEl(event.currentTarget);
  const handleAccountMenuClose = () => setAccountAnchorEl(null);
  const handleRunwaySettingsOpen = (event) => setRunwayAnchorEl(event.currentTarget);
  const handleRunwaySettingsClose = () => setRunwayAnchorEl(null);
  const handleDateFilterOpen = (event) => setDateFilterAnchorEl(event.currentTarget);
  const handleDateFilterClose = () => setDateFilterAnchorEl(null);

  // Debounced filter application
  const debouncedApplyDateFilter = useCallback(
    debounce(() => {
      if (!startDate || !endDate) {
        toast.error("Please select both start and end dates");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        toast.error("Start date cannot be after end date");
        return;
      }
      handleDateFilterClose();
    }, 300),
    [startDate, endDate]
  );

  const handleDashboardLevelChange = (level) => {
    setDashboardLevel(level);
    setAccountId(null);
    handleMenuClose();
  };

  const handleAccountIdChange = (id) => {
    setAccountId(id);
    handleAccountMenuClose();
  };

  const handleRunwayMonthToggle = (yearMonth) => {
    setSelectedRunwayMonths((prev) => ({
      ...prev,
      [yearMonth]: !prev[yearMonth],
    }));
  };

  const handleSelectAllMonths = () => {
    setSelectedRunwayMonths({});
  };

  const handleResetDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    handleDateFilterClose();
  };

  const handleDetailCategoryToggle = (category) => {
    setSelectedDetailCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Data fetching
  useEffect(() => {
    const loadData = async () => {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const [expensesData, earningsData] = await Promise.all([fetchExpenses(), fetchEarnings()]);

        // Validate and normalize data
        const validatedExpenses = expensesData.map((expense) => ({
          ...expense,
          date: new Date(expense.date),
          amount: Number(expense.amount) || 0,
          category: expense.category || "Uncategorized",
          accountId: expense.accountId || null,
          description: expense.description || "No description",
        }));
        const validatedEarnings = earningsData.map((earning) => ({
          ...earning,
          date: new Date(earning.date),
          amount: Number(earning.amount) || 0,
          category: earning.category || "Uncategorized",
          accountId: earning.accountId || null,
          description: earning.description || "No description",
        }));

        setData({
          expenses: validatedExpenses,
          earnings: validatedEarnings,
          isLoading: false,
          error: null,
        });

        // Set initial chart data
        const expensesByCat = validatedExpenses.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        }, {});
        setSelectedChartData(expensesByCat);
      } catch (error) {
        console.error("Error loading data:", error);
        setData((prev) => ({ ...prev, isLoading: false, error: error.message }));
        toast.error("Failed to load financial data");
      }
    };
    loadData();
  }, []);

  // Filtered data
  const filteredExpenses = useMemo(() => {
    let result = data.expenses;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      result = result.filter((expense) => {
        const expenseDate = expense.date;
        return expenseDate >= start && expenseDate <= end;
      });
    }
    if (accountId) {
      result = result.filter((expense) => expense.accountId === accountId);
    }
    return result;
  }, [data.expenses, startDate, endDate, accountId]);

  const filteredEarnings = useMemo(() => {
    let result = data.earnings;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      result = result.filter((earning) => {
        const earningDate = earning.date;
        return earningDate >= start && earningDate <= end;
      });
    }
    if (accountId) {
      result = result.filter((earning) => earning.accountId === accountId);
    }
    return result;
  }, [data.earnings, startDate, endDate, accountId]);

  const runwayExpenses = useMemo(() => {
    if (Object.keys(selectedRunwayMonths).length === 0) return data.expenses;
    const selectedFilters = Object.entries(selectedRunwayMonths)
      .filter(([_, isSelected]) => isSelected)
      .map(([yearMonth]) => {
        const [year, month] = yearMonth.split("-");
        return { year: parseInt(year), month: parseInt(month) };
      });
    return data.expenses.filter((expense) => {
      const date = expense.date;
      return selectedFilters.some(
        (filter) => date.getFullYear() === filter.year && date.getMonth() === filter.month
      );
    });
  }, [data.expenses, selectedRunwayMonths]);

  const runwayEarnings = useMemo(() => {
    if (Object.keys(selectedRunwayMonths).length === 0) return data.earnings;
    const selectedFilters = Object.entries(selectedRunwayMonths)
      .filter(([_, isSelected]) => isSelected)
      .map(([yearMonth]) => {
        const [year, month] = yearMonth.split("-");
        return { year: parseInt(year), month: parseInt(month) };
      });
    return data.earnings.filter((earning) => {
      const date = earning.date;
      return selectedFilters.some(
        (filter) => date.getFullYear() === filter.year && date.getMonth() === filter.month
      );
    });
  }, [data.earnings, selectedRunwayMonths]);

  // Chart data
  const expensesPieChartData = useMemo(
    () =>
      Object.entries(
        filteredExpenses.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        }, {})
      ).map(([category, amount]) => ({ value: amount, name: category })),
    [filteredExpenses]
  );

  const earningsPieChartData = useMemo(
    () =>
      Object.entries(
        filteredEarnings.reduce((acc, earning) => {
          acc[earning.category] = (acc[earning.category] || 0) + earning.amount;
          return acc;
        }, {})
      ).map(([category, amount]) => ({ value: amount, name: category })),
    [filteredEarnings]
  );

  const totalExpenses = useMemo(
    () => expensesPieChartData.reduce((acc, { value }) => acc + value, 0),
    [expensesPieChartData]
  );
  const totalEarnings = useMemo(
    () => earningsPieChartData.reduce((acc, { value }) => acc + value, 0),
    [earningsPieChartData]
  );
  const profitLoss = totalEarnings - totalExpenses;

  const runwayTotalExpenses = useMemo(
    () => runwayExpenses.reduce((acc, expense) => acc + expense.amount, 0),
    [runwayExpenses]
  );
  const runwayTotalEarnings = useMemo(
    () => runwayEarnings.reduce((acc, earning) => acc + earning.amount, 0),
    [runwayEarnings]
  );
  const runwayProfitLoss = runwayTotalEarnings - runwayTotalExpenses;
  const runwayMonthCount = Object.values(selectedRunwayMonths).filter(Boolean).length || 12;
  const runwayAvgMonthlyExpense = runwayTotalExpenses / runwayMonthCount || 1; // Avoid division by zero
  const financialRunway = Number.isFinite(runwayProfitLoss / runwayAvgMonthlyExpense)
    ? Math.round(runwayProfitLoss / runwayAvgMonthlyExpense)
    : 0;

  const expensesEarningsBarChartData = useMemo(
    () => ({
      labels: ["Expenses", "Earnings"],
      xAxisData: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      yAxisName: "Amount",
      yAxisUnit: "$",
      seriesData: [
        { name: "Expenses", type: "bar", data: [totalExpenses] },
        { name: "Earnings", type: "bar", data: [totalEarnings] },
      ],
    }),
    [totalExpenses, totalEarnings]
  );

  const financialRunwayBarChartData = useMemo(
    () => ({
      labels: ["Financial Runway"],
      xAxisData: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      yAxisName: "Months",
      yAxisUnit: "",
      seriesData: [{ name: "Financial Runway", type: "bar", data: [financialRunway] }],
      yAxis: {
        type: "value",
        name: "Months",
        min: Math.min(financialRunway, 0) - 5,
        max: Math.max(financialRunway, 0) + 5,
        axisLabel: { formatter: `{value}` },
      },
    }),
    [financialRunway]
  );

  const handleChartClick = useCallback((chartData, cardId) => {
    setSelectedChartData(chartData);
    setActiveCard(cardId);
    setSelectedDetailCategories({});
    setOpenCategory(null);
  }, []);

  const handleCategoryClick = useCallback((category) => {
    setOpenCategory((prev) => (prev === category ? null : category));
  }, []);

  const getCategoryDetails = useCallback(
    (category, type) => {
      const data = type === "expense" ? filteredExpenses : filteredEarnings;
      return data
        .filter((item) => item.category === category)
        .map((item) => {
          try {
            return {
              type: type === "expense" ? "Expense" : "Earning",
              category: item.category,
              date: item.date.toLocaleDateString(),
              amount: item.amount,
              accountId: item.accountId || "N/A",
              description: item.description,
            };
          } catch (error) {
            console.error(`Error processing ${type} item:`, item, error);
            return null;
          }
        })
        .filter(Boolean);
    },
    [filteredExpenses, filteredEarnings]
  );

  const tableRows = useMemo(() => {
    if (!selectedChartData) return [];
    return Object.entries(selectedChartData)
      .filter(([category]) =>
        activeCard === "expenses"
          ? expensesPieChartData.some((item) => item.name === category)
          : earningsPieChartData.some((item) => item.name === category)
      )
      .map(([category, amount]) => ({
        category,
        amount,
        isSelected: !!selectedDetailCategories[category],
        onToggle: handleDetailCategoryToggle,
        isOpen: openCategory === category,
        onCategoryClick: handleCategoryClick,
      }));
  }, [
    selectedChartData,
    activeCard,
    expensesPieChartData,
    earningsPieChartData,
    selectedDetailCategories,
    openCategory,
    handleDetailCategoryToggle,
    handleCategoryClick,
  ]);

  const accountIds = useMemo(
    () =>
      [...new Set([...data.expenses, ...data.earnings].map((item) => item.accountId))].filter(
        Boolean
      ),
    [data.expenses, data.earnings]
  );

  const availableYears = useMemo(() => {
    const allDates = [...data.expenses, ...data.earnings].map((item) => item.date.getFullYear());
    return [...new Set(allDates)].sort();
  }, [data.expenses, data.earnings]);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (data.isLoading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={8} mt={8} display="flex" justifyContent="center">
          <CircularProgress />
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  if (data.error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={8} mt={8} display="flex" justifyContent="center">
          <Typography color="error">Error loading data: {data.error}</Typography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={8} mt={8}>
        <MDBox mb={4} display="flex" justifyContent="flex-start" gap={2} alignItems="center">
          <div className="radio-inputs">
            <label className="radio">
              <input
                type="radio"
                name="dashboardLevel"
                value="Organization Level"
                checked={dashboardLevel === "Organization Level"}
                onChange={() => handleDashboardLevelChange("Organization Level")}
              />
              <span className="name">Organization Level</span>
            </label>
            <label className="radio">
              <input
                type="radio"
                name="dashboardLevel"
                value="Account Level"
                checked={dashboardLevel === "Account Level"}
                onChange={() => handleDashboardLevelChange("Account Level")}
              />
              <span className="name">Account Level</span>
            </label>
          </div>

          {dashboardLevel === "Account Level" && (
            <TextField
              select
              label="Select Account ID"
              value={accountId || ""}
              onChange={(e) => handleAccountIdChange(e.target.value)}
              variant="outlined"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {accountIds.map((id) => (
                <MenuItem key={id} value={id}>
                  {id}
                </MenuItem>
              ))}
            </TextField>
          )}

          <IconButton size="small" onClick={handleDateFilterOpen}>
            <SettingsIcon />
          </IconButton>
          <Menu
            id="date-filter-menu"
            anchorEl={dateFilterAnchorEl}
            open={Boolean(dateFilterAnchorEl)}
            onClose={handleDateFilterClose}
          >
            <MDBox p={2} display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate || ""}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate || ""}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" onClick={debouncedApplyDateFilter}>
                Apply Filter
              </Button>
              <Button variant="outlined" onClick={handleResetDateFilter}>
                Reset Filter
              </Button>
            </MDBox>
          </Menu>
        </MDBox>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <PieChart
              title="Expenses by Category"
              description={`Category-wise expenses${
                startDate && endDate
                  ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(
                      endDate
                    ).toLocaleDateString()})`
                  : ""
              }`}
              data={expensesPieChartData}
              onClick={() =>
                handleChartClick(
                  filteredExpenses.reduce((acc, e) => {
                    acc[e.category] = (acc[e.category] || 0) + e.amount;
                    return acc;
                  }, {}),
                  "expenses"
                )
              }
              isActive={activeCard === "expenses"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PieChart
              title="Earnings by Category"
              description={`Category-wise earnings${
                startDate && endDate
                  ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(
                      endDate
                    ).toLocaleDateString()})`
                  : ""
              }`}
              data={earningsPieChartData}
              onClick={() =>
                handleChartClick(
                  filteredEarnings.reduce((acc, e) => {
                    acc[e.category] = (acc[e.category] || 0) + e.amount;
                    return acc;
                  }, {}),
                  "earnings"
                )
              }
              isActive={activeCard === "earnings"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ReportsBarChart
              title="Expenses vs Earnings"
              description={`Comparison of expenses and earnings${
                startDate && endDate
                  ? ` (${new Date(startDate).toLocaleDateString()} - ${new Date(
                      endDate
                    ).toLocaleDateString()})`
                  : ""
              }`}
              chart={expensesEarningsBarChartData}
              onClick={() => handleChartClick(null, "expensesEarnings")}
              isActive={activeCard === "expensesEarnings"}
              profitLoss={profitLoss}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ReportsBarChart
              title="Financial Runway"
              description={
                <MDBox display="flex" alignItems="center" justifyContent="space-between">
                  <span>
                    Months of runway
                    {Object.keys(selectedRunwayMonths).length === 0
                      ? " (All Months)"
                      : ` (${Object.entries(selectedRunwayMonths)
                          .filter(([_, selected]) => selected)
                          .map(([key]) => key)
                          .join(", ")})`}
                  </span>
                  <IconButton size="small" onClick={handleRunwaySettingsOpen}>
                    <SettingsIcon />
                  </IconButton>
                </MDBox>
              }
              chart={financialRunwayBarChartData}
              onClick={() => handleChartClick(null, "financialRunway")}
              isActive={activeCard === "financialRunway"}
              runwayMonths={financialRunway}
            />
            <Menu
              id="runway-month-menu"
              anchorEl={runwayAnchorEl}
              open={Boolean(runwayAnchorEl)}
              onClose={handleRunwaySettingsClose}
            >
              <MenuItem onClick={handleSelectAllMonths}>All Months</MenuItem>
              {availableYears.map((year) =>
                months.map((month, index) => (
                  <MenuItem key={`${year}-${index}`} disableGutters>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!selectedRunwayMonths[`${year}-${index}`]}
                          onChange={() => handleRunwayMonthToggle(`${year}-${index}`)}
                        />
                      }
                      label={`${month} ${year}`}
                      sx={{ marginLeft: 1 }}
                    />
                  </MenuItem>
                ))
              )}
            </Menu>
          </Grid>
        </Grid>
        <MDBox mt={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {(activeCard === "expenses" || activeCard === "earnings") && selectedChartData && (
                <DataTable
                  table={{ columns: tableColumns, rows: tableRows }}
                  showTotalEntries={false}
                  isSorted={false}
                  noEndBorder
                  entriesPerPage={false}
                  sx={{
                    "& .MuiTable-root": {
                      border: "1px solid #ddd",
                    },
                    "& .MuiTableCell-root": {
                      padding: "10px",
                    },
                    "& .MuiTableRow-root:nth-of-type(odd)": {
                      backgroundColor: "#f9f9f9",
                    },
                  }}
                />
              )}
            </Grid>
          </Grid>
        </MDBox>
        <MDBox mt={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {openCategory &&
                !Object.keys(selectedDetailCategories).some(
                  (key) => selectedDetailCategories[key]
                ) && (
                  <DataTable
                    table={{
                      columns: detailsColumns,
                      rows: getCategoryDetails(
                        openCategory,
                        activeCard === "expenses" ? "expense" : "earning"
                      ),
                    }}
                    showTotalEntries={false}
                    isSorted={false}
                    noEndBorder
                    entriesPerPage={false}
                  />
                )}
              {Object.keys(selectedDetailCategories).some(
                (key) => selectedDetailCategories[key]
              ) && (
                <DataTable
                  table={{
                    columns: detailsColumns,
                    rows: Object.entries(selectedDetailCategories)
                      .filter(([_, selected]) => selected)
                      .flatMap(([category]) =>
                        getCategoryDetails(
                          category,
                          activeCard === "expenses" ? "expense" : "earning"
                        )
                      ),
                  }}
                  showTotalEntries={false}
                  isSorted={false}
                  noEndBorder
                  entriesPerPage={false}
                />
              )}
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Dashboard;
