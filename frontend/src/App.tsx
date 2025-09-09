import { useState, useEffect } from 'react';
import { 
  Database, 
  CreditCard, 
  Upload, 
  Activity, 
  Users,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { userAPI, User, TestResult } from './api';

function App() {
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<TestResult | null>(null);
  const [testEmail, setTestEmail] = useState('user@example.com');
  const [testUser, setTestUser] = useState<User | null>(null);
  const [testFileName, setTestFileName] = useState('test-document.pdf');

  // Check health on component mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const result = await userAPI.health();
      setHealthStatus(result);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({ status: 'unhealthy' });
    }
  };

  const testDatabase = async () => {
    setLoading(true);
    try {
      const result = await userAPI.testDB();
      setDbStatus(result);
    } catch (error: any) {
      setDbStatus({
        success: false,
        error: error.response?.data?.error || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const testCredits = async () => {
    if (!testEmail) return;
    
    setLoading(true);
    try {
      const result = await userAPI.testCredits(testEmail);
      setTestUser(result.user);
      setDbStatus({
        success: true,
        message: `Credits test successful! User now has ${result.user.credits} credits.`
      });
    } catch (error: any) {
      setDbStatus({
        success: false,
        error: error.response?.data?.error || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const testFiles = async () => {
    if (!testUser || !testFileName) return;
    
    setLoading(true);
    try {
      const result = await userAPI.testFiles(testUser.id, testFileName);
      setDbStatus(result);
    } catch (error: any) {
      setDbStatus({
        success: false,
        error: error.response?.data?.error || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div className="card">
        <div className="flex justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-4">
              📊 Credit SaaS Dashboard
            </h1>
            <p className="text-gray-600 mb-4">
              MongoDB-powered credit management system with blockchain integration
            </p>
          </div>
          <div className="flex">
            <div className="text-center">
              <div className={`flex ${healthStatus?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                {healthStatus?.status === 'healthy' ? (
                  <CheckCircle size={24} />
                ) : (
                  <XCircle size={24} />
                )}
                <span className="ml-2 font-semibold">
                  {healthStatus?.status === 'healthy' ? 'System Healthy' : 'System Down'}
                </span>
              </div>
              {healthStatus?.timestamp && (
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(healthStatus.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Test Cards */}
      <div className="grid grid-3">
        {/* Database Test */}
        <div className="card">
          <div className="flex mb-4">
            <Database className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold ml-2">Database Test</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Test MongoDB connection and create a sample user
          </p>
          <button 
            onClick={testDatabase}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
            Test Database
          </button>
        </div>

        {/* Credit System Test */}
        <div className="card">
          <div className="flex mb-4">
            <CreditCard className="text-green-600" size={24} />
            <h3 className="text-lg font-semibold ml-2">Credit System</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Test user creation and credit operations
          </p>
          <div className="mb-4">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email"
              className="input mb-2"
            />
          </div>
          <button 
            onClick={testCredits}
            disabled={loading || !testEmail}
            className="btn btn-success"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
            Test Credits
          </button>
        </div>

        {/* File System Test */}
        <div className="card">
          <div className="flex mb-4">
            <Upload className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold ml-2">File System</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Test file operations (requires user first)
          </p>
          <div className="mb-4">
            <input
              type="text"
              value={testFileName}
              onChange={(e) => setTestFileName(e.target.value)}
              placeholder="Enter filename"
              className="input mb-2"
            />
          </div>
          <button 
            onClick={testFiles}
            disabled={loading || !testUser || !testFileName}
            className={`btn ${testUser ? 'btn-primary' : 'btn-secondary'}`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            Test Files
          </button>
          {!testUser && (
            <p className="text-sm text-gray-600 mt-2">
              Run credit test first to create a user
            </p>
          )}
        </div>
      </div>

      {/* Results Section */}
      {dbStatus && (
        <div className="card">
          <div className="flex mb-4">
            <Activity className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold ml-2">Test Results</h3>
          </div>
          <div className={`p-4 rounded-lg ${dbStatus.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex">
              {dbStatus.success ? (
                <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              ) : (
                <XCircle className="text-red-600 flex-shrink-0" size={20} />
              )}
              <div className="ml-2">
                <p className={`font-semibold ${dbStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                  {dbStatus.success ? 'Success!' : 'Error!'}
                </p>
                <p className={`text-sm ${dbStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                  {dbStatus.message || dbStatus.error}
                </p>
                {dbStatus.testUser && (
                  <div className="mt-2 text-sm text-green-700">
                    <p><strong>User ID:</strong> {dbStatus.testUser.id}</p>
                    <p><strong>Email:</strong> {dbStatus.testUser.email}</p>
                    <p><strong>Credits:</strong> {dbStatus.testUser.credits}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current User Info */}
      {testUser && (
        <div className="card">
          <div className="flex mb-4">
            <Users className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold ml-2">Current Test User</h3>
          </div>
          <div className="grid grid-3">
            <div>
              <p className="text-sm text-gray-600">User ID</p>
              <p className="font-semibold">{testUser.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-semibold">{testUser.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Credits</p>
              <p className="font-semibold text-green-600">{testUser.credits}</p>
            </div>
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🚀 System Information</h3>
        <div className="grid grid-2">
          <div>
            <h4 className="font-semibold text-blue-600 mb-2">Backend Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ MongoDB Database</li>
              <li>✅ User Management</li>
              <li>✅ Credit System</li>
              <li>✅ File Operations</li>
              <li>✅ Blockchain Integration</li>
              <li>✅ API Authentication</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-green-600 mb-2">Available APIs</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>🔗 GET /health</li>
              <li>🔗 GET /test-db</li>
              <li>🔗 POST /credits/test</li>
              <li>🔗 POST /files/test</li>
              <li>🔗 Authentication Routes</li>
              <li>🔗 User Dashboard Routes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
