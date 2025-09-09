import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  CreditCard, 
  Upload, 
  FileText, 
  User, 
  LogOut, 
  Plus, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Activity
} from 'lucide-react';
import { api } from './api-full';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  credits: number;
  membership: string;
  createdAt: string;
}

interface UploadedFile {
  id: string;
  filename: string;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'failed';
  creditCost: number;
}

interface Report {
  id: string;
  filename: string;
  generatedAt: string;
  type: string;
  status: 'completed' | 'processing';
}

export const Dashboard: React.FC = () => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [profileData, filesData, reportsData] = await Promise.all([
        api.getUserProfile(),
        api.getUserFiles(),
        api.getUserReports()
      ]);
      
      setProfile(profileData);
      setFiles(filesData);
      setReports(reportsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      await api.uploadFile(uploadFile);
      setUploadFile(null);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBuyCredits = async (amount: number) => {
    try {
      const session = await api.createPaymentSession(amount);
      // In a real app, redirect to Stripe checkout
      alert(`Payment session created for ${amount} credits. In production, this would redirect to Stripe.`);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Credit SaaS</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <CreditCard className="mr-1" size={16} />
                <span className="font-medium">{profile?.credits || 0} Credits</span>
              </div>
              <div className="text-sm text-gray-500">
                Welcome, {profile?.firstName || user?.firstName}
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 p-2"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'upload', label: 'Upload Files', icon: Upload },
              { id: 'files', label: 'My Files', icon: FileText },
              { id: 'reports', label: 'Reports', icon: Download },
              { id: 'profile', label: 'Profile', icon: User },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`${
                  activeTab === id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon size={16} className="mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Credits</p>
                    <p className="text-2xl font-semibold text-gray-900">{profile?.credits || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Files Uploaded</p>
                    <p className="text-2xl font-semibold text-gray-900">{files.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Download className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Reports Generated</p>
                    <p className="text-2xl font-semibold text-gray-900">{reports.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Membership</p>
                    <p className="text-2xl font-semibold text-gray-900 capitalize">{profile?.membership || 'Free'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('upload')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Upload className="mr-2" size={20} />
                  Upload New File
                </button>
                <button
                  onClick={() => handleBuyCredits(100)}
                  className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="mr-2" size={20} />
                  Buy 100 Credits
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="mr-2" size={20} />
                  View Reports
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {files.slice(0, 5).map((file) => (
                  <div key={file.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="mr-3 text-gray-400" size={16} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                        <p className="text-sm text-gray-500">
                          Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {file.status === 'completed' && <CheckCircle className="text-green-500" size={16} />}
                      {file.status === 'processing' && <Clock className="text-yellow-500" size={16} />}
                      {file.status === 'failed' && <AlertCircle className="text-red-500" size={16} />}
                    </div>
                  </div>
                ))}
                {files.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No files uploaded yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload File</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Choose a file to upload
                  </p>
                  <p className="text-gray-500 mb-4">
                    Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
                  </p>
                  
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 inline-flex items-center"
                  >
                    <Plus className="mr-2" size={16} />
                    Select File
                  </label>
                </div>
              </div>

              {uploadFile && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{uploadFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={handleFileUpload}
                      disabled={isUploading}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Credit Cost</h4>
                <p className="text-sm text-blue-700">
                  Each file upload costs 10 credits. You currently have {profile?.credits || 0} credits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">My Files</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {files.map((file) => (
                <div key={file.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-3 text-gray-400" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">{file.filename}</p>
                      <p className="text-sm text-gray-500">
                        Uploaded {new Date(file.uploadedAt).toLocaleDateString()} • {file.creditCost} credits
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        file.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : file.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {file.status}
                    </span>
                    {file.status === 'completed' && (
                      <button className="text-indigo-600 hover:text-indigo-700 text-sm">
                        Download Report
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {files.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No files uploaded yet</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-2 text-indigo-600 hover:text-indigo-700"
                  >
                    Upload your first file
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Generated Reports</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {reports.map((report) => (
                <div key={report.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Download className="mr-3 text-gray-400" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">{report.filename}</p>
                      <p className="text-sm text-gray-500">
                        Generated {new Date(report.generatedAt).toLocaleDateString()} • {report.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        report.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {report.status}
                    </span>
                    {report.status === 'completed' && (
                      <button className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">
                        Download
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <Download className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No reports generated yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profile?.firstName || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <input
                    type="text"
                    value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membership Plan
                  </label>
                  <input
                    type="text"
                    value={profile?.membership || 'Free'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 capitalize"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Buy More Credits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { amount: 100, price: 10 },
                      { amount: 500, price: 40 },
                      { amount: 1000, price: 70 },
                    ].map(({ amount, price }) => (
                      <button
                        key={amount}
                        onClick={() => handleBuyCredits(amount)}
                        className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 text-center"
                      >
                        <p className="text-lg font-semibold">{amount} Credits</p>
                        <p className="text-gray-600">${price}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
