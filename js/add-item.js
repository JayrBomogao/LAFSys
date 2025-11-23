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

    // Gather dynamic category fields to enrich description
    const catFieldsContainer = document.getElementById('categoryFields');
    let detailsText = '';
    if (catFieldsContainer) {
      const inputs = catFieldsContainer.querySelectorAll('input, select');
      const parts = [];
      inputs.forEach(inp => {
        const label = inp.getAttribute('data-label') || inp.placeholder || inp.name || inp.id;
        const value = (inp.value || '').trim();
        if (value) parts.push(`${label}: ${value}`);
      });
      if (parts.length) detailsText = `\n\nAdditional Details\n- ${parts.join('\n- ')}`;
    }

    const payload = {
      title: document.getElementById('itemName').value.trim(),
      category: resolvedCategory,
      description: (document.getElementById('itemDescription').value.trim() + detailsText).trim(),
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
    // Dynamic category-specific fields
    const detailsSection = document.getElementById('categoryDetailsSection');
    const fieldsHost = document.getElementById('categoryFields');
    const fieldSets = {
      wallet: [
        { type:'text', id:'brand', label:'Brand', placeholder:'e.g., Gucci' },
        { type:'text', id:'color', label:'Color', placeholder:'e.g., Black' },
        { type:'text', id:'material', label:'Material', placeholder:'e.g., Leather' }
      ],
      phone: [
        { type:'text', id:'brand', label:'Brand/Model', placeholder:'e.g., iPhone 13' },
        { type:'text', id:'color', label:'Color', placeholder:'e.g., Blue' },
        { type:'text', id:'case', label:'Case', placeholder:'e.g., With blue case' }
      ],
      laptop: [
        { type:'text', id:'brand', label:'Brand/Model', placeholder:'e.g., Dell XPS 13' },
        { type:'text', id:'color', label:'Color', placeholder:'e.g., Silver' },
        { type:'text', id:'serial', label:'Serial/Asset Tag', placeholder:'Optional' }
      ],
      keys: [
        { type:'text', id:'keytype', label:'Key Type', placeholder:'e.g., House, Car' },
        { type:'text', id:'keyring', label:'Keychain/Ring', placeholder:'e.g., Red keychain' }
      ],
      bag: [
        { type:'text', id:'brand', label:'Brand', placeholder:'e.g., Jansport' },
        { type:'text', id:'color', label:'Color', placeholder:'e.g., Black' }
      ],
      clothing: [
        { type:'text', id:'type', label:'Type', placeholder:'e.g., Jacket' },
        { type:'text', id:'color', label:'Color', placeholder:'e.g., Green' },
        { type:'text', id:'size', label:'Size', placeholder:'e.g., M' }
      ],
      jewelry: [
        { type:'text', id:'type', label:'Type', placeholder:'e.g., Ring, Necklace' },
        { type:'text', id:'material', label:'Material', placeholder:'e.g., Gold' }
      ],
      documents: [
        { type:'text', id:'doctype', label:'Document Type', placeholder:'e.g., ID, Passport' },
        { type:'text', id:'name', label:'Name on Document', placeholder:'e.g., Juan Dela Cruz' }
      ]
    };
    const renderFields = () => {
      if (!categorySelect || !fieldsHost || !detailsSection) return;
      const key = categorySelect.value;
      const set = fieldSets[key];
      if (!set) { detailsSection.style.display = 'none'; fieldsHost.innerHTML = ''; return; }
      detailsSection.style.display = '';
      fieldsHost.innerHTML = set.map(f => `
        <div class="form-group">
          <label>${f.label}</label>
          <input type="text" class="form-control" data-label="${f.label}" placeholder="${f.placeholder || ''}">
        </div>
      `).join('');
    };
    if (categorySelect) {
      categorySelect.addEventListener('change', renderFields);
      renderFields();
    }
    const form = document.getElementById('itemForm');
    if (form) form.addEventListener('submit', onSubmit);
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', ()=> alert('Draft saved successfully!'));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
