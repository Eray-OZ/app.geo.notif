import React, { useState, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Modal, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Reminder, getStoredReminders, deleteReminderFromStorage, updateReminderStatus, storage } from '@/services/geofencingService';
import { Ionicons } from '@expo/vector-icons';

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [newNote, setNewNote] = useState('');

  // Fetch reminders every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  const loadReminders = () => {
    const data = getStoredReminders();
    // Sort by creation date (newest first)
    setReminders(data.sort((a, b) => b.createdAt - a.createdAt));
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to remove this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteReminderFromStorage(id);
            loadReminders();
          }
        },
      ]
    );
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setNewNote(reminder.note);
    setIsEditModalVisible(true);
  };

  const handleUpdateNote = () => {
    if (!editingReminder) return;

    const current = getStoredReminders();
    const updated = current.map(r => 
      r.id === editingReminder.id ? { ...r, note: newNote } : r
    );
    
    // Save updated list back to MMKV
    storage.set('user_reminders', JSON.stringify(updated));
    
    setIsEditModalVisible(false);
    loadReminders();
    Alert.alert('Success', 'Reminder updated successfully.');
  };

  const renderReminderItem = ({ item }: { item: Reminder }) => (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
          {item.title}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#4CAF50' : '#9E9E9E' }]}>
          <ThemedText style={styles.statusText}>{item.isActive ? 'Active' : 'Finished'}</ThemedText>
        </View>
      </View>
      
      <ThemedText style={styles.note} numberOfLines={3}>
        {item.note || 'No description provided.'}
      </ThemedText>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]} 
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color="#2196F3" />
          <ThemedText style={{ color: '#2196F3', marginLeft: 4 }}>Edit</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]} 
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#FF5252" />
          <ThemedText style={{ color: '#FF5252', marginLeft: 4 }}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>My Reminders</ThemedText>
      
      {reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <ThemedText style={styles.emptyText}>No reminders set yet.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Note Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Edit Note</ThemedText>
            <TextInput
              style={styles.modalInput}
              multiline
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Update your reminder note..."
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setIsEditModalVisible(false)}
              >
                <ThemedText style={{color: '#666'}}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]} 
                onPress={handleUpdateNote}
              >
                <ThemedText style={{color: '#fff', fontWeight: '600'}}>Update</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    justifyContent: 'flex-end',
    gap: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {},
  deleteBtn: {},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    color: '#000',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  saveBtn: {
    backgroundColor: '#2196F3',
  },
});
