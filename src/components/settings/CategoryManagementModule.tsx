import { Plus, Edit3, Eye, EyeOff, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategoryDefinition, categoryService, iconMap } from '@/lib/category-service';
import { SubModuleHeader } from './Common';

interface CategoryManagementModuleProps {
  categories: CategoryDefinition[];
  setEditingCategory: (cat: CategoryDefinition | null) => void;
  setIsAddingCategory: (isAdding: boolean) => void;
  onBack: () => void;
}

export function CategoryManagementModule({ 
  categories, 
  setEditingCategory, 
  setIsAddingCategory, 
  onBack 
}: CategoryManagementModuleProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Category Management" onBack={onBack} />
      
      <div className="flex flex-col gap-3">
        <Button 
          onClick={() => {
            setIsAddingCategory(true);
            setEditingCategory({
              id: `custom_${Date.now()}`,
              label: '',
              iconName: 'MoreHorizontal',
              color: 'text-slate-400',
              bgColor: 'bg-slate-500/15',
              gradientFrom: '#94a3b8',
              gradientTo: '#64748b',
              description: '',
              isVisible: true,
              isSystem: false
            });
          }}
          className="w-full h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 gap-2 mb-2"
        >
          <Plus className="h-4 w-4" /> Add Custom Category
        </Button>

        <div className="grid grid-cols-1 gap-2">
          {categories.map(cat => {
            const Icon = iconMap[cat.iconName] || MoreHorizontal;
            return (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 group hover:border-primary/40 transition-all shadow-sm dark:shadow-none">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", cat.bgColor)}>
                  <Icon className={cn("h-5 w-5", cat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{cat.label}</p>
                    {cat.isSystem && <span className="text-[8px] font-black bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-tighter">System</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{cat.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"
                    onClick={() => setEditingCategory(cat)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl transition-colors",
                      cat.isVisible ? "text-emerald-500 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-muted/20"
                    )}
                    onClick={() => categoryService.update(cat.id, { isVisible: !cat.isVisible })}
                  >
                    {cat.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  {!cat.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        toast.warning('Delete this category?', {
                          description: 'Expenses using it will still work but you cannot select it anymore.',
                          action: {
                            label: 'Delete',
                            onClick: () => categoryService.delete(cat.id)
                          }
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
