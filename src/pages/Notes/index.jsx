import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from '../../components/common/SearchBar';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import UnifiedLoader from '../../components/common/UnifiedLoader';
import {
  confirmAction,
  ensureSuccess,
  notifyError,
  notifySuccess,
} from '../../utils/feedback';
import { getStatusBadgeClass } from '../../utils/status';
import { validateRequiredFields } from '../../utils/validation';

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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [sortKey, setSortKey] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadNotes = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const res = await window.xnoll.notesQuery({
        page,
        pageSize,
        search,
        sortKey,
        sortDir,
      });
      ensureSuccess(res, 'Unable to load notes.');
      setNotes(res.rows || []);
      setTotal(Number(res.total || 0));
      setTotalPages(Number(res.totalPages || 1));
    } catch (error) {
      notifyError(error, 'Unable to load notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [page, pageSize, search, sortKey, sortDir]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const validationError = validateRequiredFields({ title: form.title }, { title: 'Title' });
    if (validationError) return notifyError(validationError);

    setLoading(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        is_pinned: form.is_pinned ? 1 : 0,
        tags: form.tags.trim(),
        content: form.content.trim(),
      };
      const result = isEditing && form.id != null
        ? await window.xnoll.notesUpdate(payload)
        : await window.xnoll.notesCreate(payload);
      ensureSuccess(result, 'Unable to save note.');

      await loadNotes();
      setShowModal(false);
      setForm(emptyForm);
      setIsEditing(false);
      notifySuccess(isEditing ? 'Note updated successfully.' : 'Note created successfully.');
    } catch (err) {
      notifyError(err, 'Unable to save note.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    const confirmed = await confirmAction({
      title: 'Delete note?',
      text: 'This note will be deleted permanently.',
      confirmButtonText: 'Delete',
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      ensureSuccess(await window.xnoll.notesDelete(id), 'Unable to delete note.');
      await loadNotes();
      notifySuccess('Note deleted successfully.');
    } catch (error) {
      notifyError(error, 'Unable to delete note.');
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

  const sortedView = useMemo(() => {
    return [...notes].sort((a, b) => Number(b.is_pinned || 0) - Number(a.is_pinned || 0));
  }, [notes]);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-0">Notes</h4>
          <small className="text-muted">Fast jotting with tags & pin</small>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} size="sm" />
          <Button variant="primary" size="sm" onClick={openCreate}>
            + New Note
          </Button>
        </div>
      </div>
      <UnifiedLoader show={loading} text="Loading notes..." />

      <div className="row g-3">
        {sortedView.map((note) => (
          <div className="col-md-4" key={note.id}>
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="mb-1">
                      {note.title}{' '}
                      {note.is_pinned ? (
                        <span className={`${getStatusBadgeClass("pinned", "note")} ms-2`}>Pinned</span>
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
                    <button className="btn btn-outline-primary" onClick={() => openEdit(note)}>Edit</button>
                    <button className="btn btn-outline-danger" onClick={() => handleDelete(note.id)}>Del</button>
                  </div>
                </div>
                <p className="mt-2 mb-0 small text-muted" style={{ whiteSpace: 'pre-line' }}>
                  {note.content || '—'}
                </p>
              </div>
            </div>
          </div>
        ))}

        {!sortedView.length && !loading && (
          <div className="col-12 text-center text-muted py-4">No notes yet.</div>
        )}
      </div>

      <Pagination
        currentPage={Math.min(page, totalPages || 1)}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

      <Modal show={showModal} onClose={() => setShowModal(false)} title={isEditing ? 'Edit Note' : 'New Note'}>
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label className="form-label small mb-0">Title *</label>
            <input className="form-control form-control-sm" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required autoFocus />
          </div>
          <div className="mb-2">
            <label className="form-label small mb-0">Content</label>
            <textarea className="form-control form-control-sm" rows="4" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="mb-2">
            <label className="form-label small mb-0">Tags (comma separated)</label>
            <input className="form-control form-control-sm" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="e.g. followup,priority" />
          </div>
          <div className="form-check form-switch ui-switch mb-3">
            <input className="form-check-input" type="checkbox" id="notePin" checked={!!form.is_pinned} onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))} />
            <label className="form-check-label" htmlFor="notePin">Pin this note</label>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" type="button" onClick={() => setShowModal(false)} size="sm">Cancel</Button>
            <Button variant="primary" type="submit" size="sm" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NotesPage;
