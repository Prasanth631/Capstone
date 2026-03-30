import { Download, FileText, UserCog, Database, Trash2 } from 'lucide-react'
import { exportToCSV, exportToPDF } from '../../utils/exportUtils'
import { useAuth } from '../../context/AuthContext'

export default function SettingsPanel({ transactions }) {
  const { user } = useAuth()

  // For safety, not actually allowing full DB wipe yet.
  const handleDeleteWipe = () => {
    alert("Data Wipe feature requires email confirmation and is disabled in this demo.")
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-b-4 border-b-purple-500">
        <div>
          <h2 className="text-xl font-bold text-heading flex items-center gap-2">
            <UserCog className="w-6 h-6 text-purple-500" /> Account Settings
          </h2>
          <p className="text-sm text-surface-500 mt-1">Manage credentials, preferences, and data exports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className="glass-card overflow-hidden">
           <div className="p-5 border-b border-surface-200 dark:border-white/10 bg-surface-50/50 dark:bg-white/[0.02]">
             <h3 className="font-bold text-heading">Profile Details</h3>
           </div>
           <div className="p-5 space-y-4">
              <div>
                 <label className="text-[10px] font-bold tracking-widest uppercase text-surface-400">Username</label>
                 <p className="font-semibold text-heading mt-0.5">{user?.username || 'Guest'}</p>
              </div>
              <div>
                 <label className="text-[10px] font-bold tracking-widest uppercase text-surface-400">Email Address</label>
                 <p className="font-semibold text-surface-700 dark:text-white/80 mt-0.5">{user?.email || 'N/A'}</p>
              </div>
              <div>
                 <label className="text-[10px] font-bold tracking-widest uppercase text-surface-400">Account Tier</label>
                 <div className="mt-1 inline-flex px-2 py-0.5 rounded text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400">
                   ExpenseFlow SaaS Pro
                 </div>
              </div>
           </div>
        </div>

        {/* Data Management */}
        <div className="glass-card overflow-hidden">
           <div className="p-5 border-b border-surface-200 dark:border-white/10 bg-surface-50/50 dark:bg-white/[0.02]">
             <h3 className="font-bold text-heading flex items-center gap-2">
               <Database className="w-4 h-4 text-primary-500" /> Data Management
             </h3>
           </div>
           <div className="p-5 space-y-5">
              
              <div>
                <p className="text-sm font-semibold text-heading mb-3">Bulk Export (All Time)</p>
                <div className="flex flex-wrap gap-3">
                   <button 
                     onClick={() => exportToCSV(transactions)}
                     className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-surface-100 dark:bg-white/5 hover:bg-surface-200 dark:hover:bg-white/10 font-medium text-sm transition-colors text-surface-700 dark:text-white/80"
                   >
                     <Download className="w-4 h-4" /> Download CSV
                   </button>
                   <button 
                     onClick={() => exportToPDF(transactions)}
                     className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-medium text-sm transition-colors"
                   >
                     <FileText className="w-4 h-4" /> Generate PDF
                   </button>
                </div>
                <p className="text-xs text-surface-400 mt-2">Downloads a complete ledger of {transactions.length} records.</p>
              </div>

              <hr className="border-surface-200 dark:border-white/10" />

              <div>
                <p className="text-sm font-semibold text-red-500 mb-2 mt-2">Danger Zone</p>
                <button
                   onClick={handleDeleteWipe}
                   className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium text-sm transition-colors w-full sm:w-auto"
                >
                   <Trash2 className="w-4 h-4" /> Wipe Entire Database
                </button>
              </div>

           </div>
        </div>

      </div>
    </div>
  )
}
