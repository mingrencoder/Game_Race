const fs = require('fs');
let c = fs.readFileSync('src/components/GarageUI.tsx', 'utf8');

c = c.replace(/<div className="fixed top-20 left-1\/2 -translate-x-1\/2 z-\[150\] bg-red-500\/90 text-white px-6 py-3 rounded-full shadow-\[0_0_20px_rgba\(239,68,68,0\.5\)\] font-bold border border-red-400">\s*\{equipError\}\s*<\/div>/g, 
`<div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black/90 p-4 border border-red-500/50 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.3)] max-w-sm w-full">
    <div className="text-red-500 text-center text-sm font-bold mb-4">{equipError}</div>
    <button onClick={() => setEquipError(null)} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors">确定</button>
  </motion.div>
</div>`);

c = c.replace(/<div className="fixed inset-0 z-\[100\] flex items-center justify-center bg-black\/80 backdrop-blur-sm p-4">/g, 
`<div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">`);

c = c.replace(/\{showMaintenanceConfirm && \([\s\S]*?<div className="fixed inset-0 z-50 flex items-center justify-center bg-black\/80 backdrop-blur-sm p-4">/g, 
`{showMaintenanceConfirm && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">`);


c = c.replace(/<h1 className="text-3xl md:text-4xl font-black italic text-accent-cyan tracking-widest shrink-0 leading-none">我的车库<\/h1>\s*<button onClick=\{onClose\}/, 
`<h1 className="text-3xl md:text-4xl font-black italic text-accent-cyan tracking-widest shrink-0 leading-none">我的车库</h1>
             <div className="hidden md:flex text-accent-yellow font-mono text-lg font-bold bg-black/50 px-4 py-1.5 rounded-lg border border-accent-yellow/30">
               余额: {garage.wallet.coins.toLocaleString()} ⟁
             </div>
           </div>
           <div className="flex items-center gap-4">
             <div className="md:hidden text-accent-yellow font-mono text-sm font-bold bg-black/50 px-3 py-1.5 rounded-lg border border-accent-yellow/30">
               {garage.wallet.coins.toLocaleString()} ⟁
             </div>
             <button onClick={onClose}`);

fs.writeFileSync('src/components/GarageUI.tsx', c);
