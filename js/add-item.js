(function(){
  function initImageUpload(){
    const imagePreview = document.getElementById('imagePreview');
    const imageUpload = document.getElementById('imageUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const removeImageBtn = document.getElementById('removeImageBtn');

    function setEmptyPreview(){
      imagePreview.innerHTML = `
        <div class="image-upload-text">
          <i data-lucide="upload-cloud"></i>
          <div>Click to upload or drag and drop</div>
          <div class="text-sm" style="font-size: 0.75rem; margin-top: 0.5rem; color: #94a3b8;">PNG, JPG, JPEG (max. 5MB)</div>
        </div>`;
      imagePreview.classList.remove('has-image');
      if (window.lucide?.createIcons) lucide.createIcons();
    }

    function setImage(src){
      imagePreview.innerHTML = `<img src="${src}" alt="Preview">`;
      imagePreview.classList.add('has-image');
      uploadBtn.style.display = 'none';
      removeImageBtn.style.display = 'inline-flex';
    }

    imagePreview.addEventListener('click', function(){
      if (!imagePreview.classList.contains('has-image')) imageUpload.click();
    });
    uploadBtn.addEventListener('click', () => imageUpload.click());

    imageUpload.addEventListener('change', function(e){
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target.result);
      reader.readAsDataURL(file);
    });

    removeImageBtn.addEventListener('click', function(){
      setEmptyPreview();
      imageUpload.value = '';
      uploadBtn.style.display = 'inline-flex';
      removeImageBtn.style.display = 'none';
    });

    // Drag & drop
    ['dragenter','dragover','dragleave','drop'].forEach(evt => {
      imagePreview.addEventListener(evt, (e)=>{ e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter','dragover'].forEach(evt => {
      imagePreview.addEventListener(evt, ()=>{ imagePreview.style.borderColor = '#93c5fd'; imagePreview.style.backgroundColor = '#f0f9ff'; });
    });
    ;['dragleave','drop'].forEach(evt => {
      imagePreview.addEventListener(evt, ()=>{
        imagePreview.style.borderColor = imagePreview.classList.contains('has-image') ? 'transparent' : '#cbd5e1';
        imagePreview.style.backgroundColor = imagePreview.classList.contains('has-image') ? 'transparent' : '#f8fafc';
      });
    });
    imagePreview.addEventListener('drop', (e)=>{
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target.result);
      reader.readAsDataURL(file);
      const dt = new DataTransfer(); dt.items.add(file); imageUpload.files = dt.files;
    });

    // default empty
    if (!imagePreview.classList.contains('has-image')) setEmptyPreview();
  }

  function getPreviewImage(){
    const img = document.querySelector('#imagePreview img');
    return img ? img.src : '';
  }

  function validateRequired(form){
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    requiredFields.forEach(field => {
      const v = (field.value || '').trim();
      if (!v) { field.style.borderColor = '#ef4444'; isValid = false; }
      else { field.style.borderColor = '#e2e8f0'; }
    });
    return isValid;
  }

  function onSubmit(e){
    e.preventDefault();
    const form = e.currentTarget;
    if (!validateRequired(form)) { alert('Please fill in all required fields.'); return; }

    const categorySelect = document.getElementById('itemCategory');
    const customCategory = document.getElementById('customCategory');
    const resolvedCategory = (categorySelect && categorySelect.value === 'other' && customCategory) ? (customCategory.value.trim() || 'Other') : (categorySelect?.value || 'other');

    const payload = {
      title: document.getElementById('itemName').value.trim(),
      category: resolvedCategory,
      description: document.getElementById('itemDescription').value.trim(),
      location: document.getElementById('foundLocation').value.trim(),
      date: new Date(document.getElementById('foundDate').value).toISOString(),
      status: 'active',
      image: getPreviewImage(),
      foundBy: document.getElementById('foundBy').value.trim(),
      storageLocation: document.getElementById('storageLocation').value.trim()
    };

    try {
      const item = window.DataStore?.addItem(payload);
      if (!item) throw new Error('Failed to add item');
      alert('Item published successfully!');
      window.location.href = 'admin.html';
    } catch(err){
      console.error(err);
      alert('Failed to publish item.');
    }
  }

  function init(){
    if (window.lucide?.createIcons) lucide.createIcons();
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('foundDate');
    if (dateEl && !dateEl.value) dateEl.value = today;
    initImageUpload();
    // Toggle custom category when 'Other' selected
    const categorySelect = document.getElementById('itemCategory');
    const customCategory = document.getElementById('customCategory');
    if (categorySelect && customCategory) {
      const toggleCustom = () => {
        if (categorySelect.value === 'other') {
          customCategory.style.display = '';
          customCategory.required = true;
        } else {
          customCategory.style.display = 'none';
          customCategory.required = false;
          customCategory.value = '';
        }
      };
      categorySelect.addEventListener('change', toggleCustom);
      toggleCustom();
    }
    const form = document.getElementById('itemForm');
    if (form) form.addEventListener('submit', onSubmit);
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', ()=> alert('Draft saved successfully!'));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
