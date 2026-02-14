import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const SWOTMatrix = ({ swotData, onUpdateSWOT, onAddItem, onRemoveItem, onReorderItems }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategoryItem, setEditingCategoryItem] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [activeQuadrant, setActiveQuadrant] = useState(null);
  const [newItemCategory, setNewItemCategory] = useState('General');

  const quadrants = [
    { 
      key: 'strengths', 
      title: 'Strengths', 
      subtitle: 'Internal Positive Factors',
      color: 'bg-success/10 border-success/20',
      headerColor: 'bg-success text-success-foreground',
      icon: 'TrendingUp'
    },
    { 
      key: 'weaknesses', 
      title: 'Weaknesses', 
      subtitle: 'Internal Negative Factors',
      color: 'bg-warning/10 border-warning/20',
      headerColor: 'bg-warning text-warning-foreground',
      icon: 'TrendingDown'
    },
    { 
      key: 'opportunities', 
      title: 'Opportunities', 
      subtitle: 'External Positive Factors',
      color: 'bg-primary/10 border-primary/20',
      headerColor: 'bg-primary text-primary-foreground',
      icon: 'Target'
    },
    { 
      key: 'threats', 
      title: 'Threats', 
      subtitle: 'External Negative Factors',
      color: 'bg-error/10 border-error/20',
      headerColor: 'bg-error text-error-foreground',
      icon: 'AlertTriangle'
    }
  ];

  const handleAddItem = (quadrant) => {
    if (newItemText?.trim()) {
      const category = (typeof newItemCategory === 'string' ? newItemCategory.trim() : '') || 'General';
      onAddItem(quadrant, newItemText?.trim(), category);
      setNewItemText('');
      setNewItemCategory('General');
      setActiveQuadrant(null);
    }
  };

  const handleEditItem = (quadrant, index, newText) => {
    if (newText?.trim()) {
      const updatedItems = [...swotData?.[quadrant]];
      updatedItems[index] = { ...updatedItems?.[index], text: newText?.trim() };
      onUpdateSWOT(quadrant, updatedItems);
    }
    setEditingItem(null);
  };

  const handleEditCategory = (quadrant, index, nextCategory) => {
    const category = (typeof nextCategory === 'string' ? nextCategory.trim() : '') || 'General';
    const updatedItems = [...swotData?.[quadrant]];
    updatedItems[index] = { ...updatedItems?.[index], category };
    onUpdateSWOT(quadrant, updatedItems);
    setEditingCategoryItem(null);
  };

  const handleDragStart = (e, quadrant, index) => {
    e?.dataTransfer?.setData('text/plain', JSON.stringify({ quadrant, index }));
  };

  const handleDragOver = (e) => {
    e?.preventDefault();
  };

  const handleDrop = (e, targetQuadrant, targetIndex) => {
    e?.preventDefault();
    const dragData = JSON.parse(e?.dataTransfer?.getData('text/plain'));
    onReorderItems(dragData?.quadrant, dragData?.index, targetQuadrant, targetIndex);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {quadrants?.map((quadrant) => (
        <div
          key={quadrant?.key}
          className={`${quadrant?.color} border-2 rounded-lg overflow-hidden flex flex-col min-h-[400px]`}
        >
          {/* Quadrant Header */}
          <div className={`${quadrant?.headerColor} p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon name={quadrant?.icon} size={20} />
                <div>
                  <h3 className="font-semibold text-lg">{quadrant?.title}</h3>
                  <p className="text-sm opacity-90">{quadrant?.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {swotData?.[quadrant?.key]?.length || 0} items
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveQuadrant(activeQuadrant === quadrant?.key ? null : quadrant?.key)}
                  className="text-current hover:bg-white/20"
                >
                  <Icon name="Plus" size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Add New Item Form */}
          {activeQuadrant === quadrant?.key && (
            <div className="p-4 border-b border-border/20">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Input
                  type="text"
                  placeholder={`Add new ${quadrant?.title?.toLowerCase()}...`}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e?.target?.value)}
                  onKeyPress={(e) => e?.key === 'Enter' && handleAddItem(quadrant?.key)}
                  className="flex-1"
                />
                <Input
                  type="text"
                  placeholder="Category (e.g., Technology)"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e?.target?.value)}
                  onKeyPress={(e) => e?.key === 'Enter' && handleAddItem(quadrant?.key)}
                  className="sm:w-56"
                   />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddItem(quadrant?.key)}
                  disabled={!newItemText?.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {swotData?.[quadrant?.key]?.length > 0 ? (
              swotData?.[quadrant?.key]?.map((item, index) => (
                <div
                  key={item?.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, quadrant?.key, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, quadrant?.key, index)}
                  className="bg-card border border-border rounded-lg p-3 cursor-move hover:shadow-soft transition-smooth group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingItem === `${quadrant?.key}-${index}` ? (
                        <Input
                          type="text"
                          value={item?.text}
                          onChange={(e) => {
                            const updatedItems = [...swotData?.[quadrant?.key]];
                            updatedItems[index] = { ...updatedItems?.[index], text: e?.target?.value };
                            onUpdateSWOT(quadrant?.key, updatedItems);
                          }}
                          onBlur={() => setEditingItem(null)}
                          onKeyPress={(e) => {
                            if (e?.key === 'Enter') {
                              handleEditItem(quadrant?.key, index, e?.target?.value);
                            }
                          }}
                          autoFocus
                          className="text-sm"
                        />
                      ) : (
                        <p 
                          className="text-sm text-foreground cursor-text"
                          onClick={() => setEditingItem(`${quadrant?.key}-${index}`)}
                        >
                          {item?.text}
                        </p>
                      )}
                      {editingCategoryItem === `${quadrant?.key}-${index}` ? (
                        <Input
                          type="text"
                          value={item?.category ?? ''}
                          onChange={(e) => {
                            const updatedItems = [...swotData?.[quadrant?.key]];
                            updatedItems[index] = { ...updatedItems?.[index], category: e?.target?.value };
                            onUpdateSWOT(quadrant?.key, updatedItems);
                          }}
                          onBlur={(e) => handleEditCategory(quadrant?.key, index, e?.target?.value)}
                          onKeyPress={(e) => {
                            if (e?.key === 'Enter') {
                              handleEditCategory(quadrant?.key, index, e?.target?.value);
                            }
                          }}
                          autoFocus
                          className="mt-2 text-xs"
                        />
                      ) : (
                        <span
                          className="inline-block mt-2 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full cursor-text"
                          onClick={() => setEditingCategoryItem(`${quadrant?.key}-${index}`)}
                          title="Click to edit category"
                        >
                          {(typeof item?.category === 'string' && item.category.trim()) ? item.category.trim() : 'General'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-smooth">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingItem(`${quadrant?.key}-${index}`)}
                        className="h-6 w-6"
                      >
                        <Icon name="Edit2" size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(quadrant?.key, index)}
                        className="h-6 w-6 text-error hover:text-error"
                      >
                        <Icon name="Trash2" size={12} />
                      </Button>
                      <Icon name="GripVertical" size={12} className="text-muted-foreground cursor-move" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name={quadrant?.icon} size={32} className="text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  No {quadrant?.title?.toLowerCase()} added yet
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveQuadrant(quadrant?.key)}
                  className="text-xs"
                >
                  <Icon name="Plus" size={14} className="mr-1" />
                  Add first item
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SWOTMatrix;