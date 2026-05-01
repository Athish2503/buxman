import sys

file_path = r'd:\pixel-reimburse\src\components\settings-page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Part 1: Remove the modal from renderCategories (lines 425 to 573)
# We use line numbers from the previous view_file output.
# 425:       {/* Category Editor Modal Overlay */}
# 573:         </AnimatePresence>
# Note: lines are 1-indexed in the output, so 425 is index 424.
start_idx = 424 
end_idx = 573 

new_lines = lines[:start_idx] + ["      </div>\n", "    </div>\n", "  );\n"] + lines[end_idx+1:]

# Part 2: Add the portal at the end of the return (line 868 in the ORIGINAL file, but indices shifted)
# In the original file, 868 was the closing </div> of the main return.
# Let's find the closing </div> of the component.
# Actually, it's easier to just append before the final return's last div.

# We'll search for the last </div> before the final brace.
final_content = "".join(new_lines)
portal_code = """
      {createPortal(
        <AnimatePresence>
          {editingCategory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold">{isAddingCategory ? 'New Category' : 'Edit Category'}</h4>
                    <Button variant="ghost" size="icon" onClick={() => setEditingCategory(null)} className="rounded-full">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Field 
                      id="cat-label" label="Label" value={editingCategory.label} 
                      onChange={v => setEditingCategory({ ...editingCategory, label: v })} 
                      placeholder="e.g. Subscriptions"
                    />
                    <Field 
                      id="cat-desc" label="Description" value={editingCategory.description} 
                      onChange={v => setEditingCategory({ ...editingCategory, description: v })} 
                      placeholder="Short summary"
                    />

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Icon Selection</Label>
                      <div className="grid grid-cols-5 gap-2 p-3 bg-muted/20 rounded-2xl border border-border/40 max-h-60 overflow-y-auto custom-scrollbar">
                        {Object.keys(iconMap).map(name => {
                          const Icon = iconMap[name];
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => setEditingCategory({ ...editingCategory, iconName: name })}
                              className={cn(
                                "h-12 w-full rounded-xl flex items-center justify-center transition-all",
                                editingCategory.iconName === name ? "bg-primary text-white shadow-lg scale-110" : "hover:bg-muted text-muted-foreground"
                              )}
                            >
                              <Icon className="h-6 w-6" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Aesthetic Palette</Label>
                      </div>

                      <div 
                        className="relative p-4 rounded-3xl border border-white/10 overflow-hidden group transition-all"
                        style={{ background: `linear-gradient(135deg, ${editingCategory.gradientFrom}20, ${editingCategory.gradientTo}10)` }}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl shrink-0 transition-transform group-hover:scale-105", editingCategory.bgColor)}
                            style={editingCategory.bgColor === 'bg-muted/20' ? { backgroundColor: `${editingCategory.gradientFrom}30` } : {}}
                          >
                            {(() => {
                              const PreviewIcon = iconMap[editingCategory.iconName] || MoreHorizontal;
                              return <PreviewIcon 
                                className={cn("h-7 w-7", editingCategory.color)} 
                                style={editingCategory.color === 'text-white' ? { color: editingCategory.gradientFrom } : {}}
                              />;
                            })()}
                          </div>
                          <div className="flex-1">
                             <p className="text-xs font-bold mb-1">Aesthetic Preview</p>
                             <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer border border-white/5">
                               <Palette className="h-3.5 w-3.5" />
                               <span className="text-[10px] font-black uppercase tracking-wider">Custom Color</span>
                               <input 
                                  type="color" 
                                  value={editingCategory.gradientFrom}
                                  onChange={(e) => setEditingCategory({ 
                                    ...editingCategory, 
                                    gradientFrom: e.target.value,
                                    gradientTo: e.target.value,
                                    color: 'text-white',
                                    bgColor: 'bg-muted/20'
                                  })}
                                  className="sr-only"
                                />
                             </label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-2 p-1">
                        {[
                          { from: '#3b82f6', to: '#6366f1', text: 'text-blue-400', bg: 'bg-blue-500/15' },
                          { from: '#f97316', to: '#f59e0b', text: 'text-orange-400', bg: 'bg-orange-500/15' },
                          { from: '#a855f7', to: '#8b5cf6', text: 'text-purple-400', bg: 'bg-purple-500/15' },
                          { from: '#10b981', to: '#06b6d4', text: 'text-emerald-400', bg: 'bg-emerald-500/15' },
                          { from: '#f43f5e', to: '#fb7185', text: 'text-rose-400', bg: 'bg-rose-500/15' },
                          { from: '#8b5cf6', to: '#d946ef', text: 'text-violet-400', bg: 'bg-violet-500/15' },
                          { from: '#0ea5e9', to: '#38bdf8', text: 'text-sky-400', bg: 'bg-sky-500/15' },
                          { from: '#14b8a6', to: '#0d9488', text: 'text-teal-400', bg: 'bg-teal-500/15' },
                          { from: '#facc15', to: '#ca8a04', text: 'text-yellow-400', bg: 'bg-yellow-500/15' },
                          { from: '#4ade80', to: '#16a34a', text: 'text-green-400', bg: 'bg-green-500/15' },
                          { from: '#2dd4bf', to: '#0f766e', text: 'text-teal-400', bg: 'bg-teal-500/15' },
                          { from: '#94a3b8', to: '#475569', text: 'text-slate-400', bg: 'bg-slate-500/15' },
                          { from: '#e879f9', to: '#d946ef', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15' },
                          { from: '#fbbf24', to: '#d97706', text: 'text-amber-400', bg: 'bg-amber-500/15' },
                        ].map((style, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditingCategory({ 
                              ...editingCategory, 
                              gradientFrom: style.from, 
                              gradientTo: style.to, 
                              color: style.text, 
                              bgColor: style.bg 
                            })}
                            className={cn(
                              "h-9 w-full rounded-xl border-2 transition-all",
                              editingCategory.gradientFrom === style.from ? "border-white scale-110 shadow-lg" : "border-transparent"
                            )}
                            style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setEditingCategory(null)} className="flex-1 h-12 rounded-2xl">Cancel</Button>
                      <Button onClick={() => handleSaveCategory(editingCategory)} className="flex-1 h-12 rounded-2xl bg-gradient-primary text-white">Save Category</Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
"""

# Find the last occurrence of </div>\n before the end of the file.
# We'll look for "    </div>\n  );\n}" at the end.
search_str = "    </div>\n  );\n}"
if search_str in final_content:
    final_content = final_content.replace(search_str, portal_code + "\n" + search_str)
else:
    print("Could not find insertion point")
    sys.exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_content)
