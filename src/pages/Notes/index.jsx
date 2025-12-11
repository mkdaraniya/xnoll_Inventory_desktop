import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from '../../components/common/SearchBar';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = {
  id: null,
  title: '',
  content: '',
  tags: '',
  is_pinned: 0,
};

const NotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const loadNotes = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const rows = await window.xnoll.notesList();
      setNotes(rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = [...notes];
    if (term) {
      data = data.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(term) ||
          (n.content || '').toLowerCase().includes(term) ||
          (n.tags || '').toLowerCase().includes(term)
      );
    }
        data.sort((a, b) => Number(b.is_pinned || 0) - Number(a.is_pinned || 0));
    return data;
  }, [notes, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;
        if (!form.title.trim()) return;
        setLoading(true);
        try {
          const payload = {
            ...form,
            is_pinned: form.is_pinned ? 1 : 0,
            tags: form.tags.trim(),
            content: form.content.trim(),
          };
      if (isEditing && form.id != null) {
        await window.xnoll.notesUpdate(payload);
      } else {
        await window.xnoll.notesCreate(payload);
      }
      await loadNotes();
      setShowModal(false);
      setForm(emptyForm);
      setIsEditing(false);
    } catch (err) {
      console.error('Save note failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    if (!window.confirm('Delete this note?')) return;
    setLoading(true);
    try {
      await window.xnoll.notesDelete(id);
      await loadNotes();
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (note) => {
        setForm({
          id: note.id,
          title: note.title || '',
          content: note.content || '',
          tags: note.tags || '',
          is_pinned: Number(note.is_pinned) === 1,
        });
    setIsEditing(true);
    setShowModal(true);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setShowModal(true);
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-0">Notes</h4>
          <small className="text-muted">Fast jotting with tags & pin</small>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <SearchBar value={search} onChange={setSearch} size="sm" />
          <Button variant="primary" size="sm" onClick={openCreate}>
            + New Note
          </Button>
        </div>
      </div>

      <div className="row g-3">
        {filtered.map((note) => (
          <div className="col-md-4" key={note.id}>
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="mb-1">
                      {note.title}{' '}
                      {note.is_pinned ? (
                        <span className="badge bg-warning text-dark ms-2">Pinned</span>
                      ) : null}
                    </h6>
                    {note.tags ? (
                      <div className="d-flex flex-wrap gap-1">
                        {note.tags.split(',').map((tag, index) => (
                          <span key={index} className="badge bg-secondary">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <small className="text-muted">No tags</small>
                    )}
                  </div>
                  <div className="btn-group btn-group-sm">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => openEdit(note)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(note.id)}
                    >
                      Del
                    </button>
                  </div>
                </div>
                <p className="mt-2 mb-0 small text-muted" style={{ whiteSpace: 'pre-line' }}>
                  {note.content || '—'}
                </p>
              </div>
            </div>
          </div>
        ))}

        {!filtered.length && !loading && (
          <div className="col-12 text-center text-muted py-4">No notes yet.</div>
        )}
      </div>

      <Modal show={showModal} onClose={() => setShowModal(false)} title={isEditing ? 'Edit Note' : 'New Note'}>
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label className="form-label small mb-0">Title *</label>
            <input
              className="form-control form-control-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="mb-2">
            <label className="form-label small mb-0">Content</label>
            <textarea
              className="form-control form-control-sm"
              rows="4"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div className="mb-2">
            <label className="form-label small mb-0">Tags (comma separated)</label>
            <input
              className="form-control form-control-sm"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. followup,priority"
            />
          </div>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="notePin"
                  checked={!!form.is_pinned}
                  onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="notePin">
                  Pin this note
                </label>
              </div>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" type="button" onClick={() => setShowModal(false)} size="sm">
              Cancel
            </Button>
            <Button variant="primary" type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NotesPage;

