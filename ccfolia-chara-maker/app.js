document.addEventListener('DOMContentLoaded', () => {
  const statusList = document.getElementById('status-list');
  const paramsList = document.getElementById('params-list');
  const btnAddStatus = document.getElementById('btn-add-status');
  const btnAddParam = document.getElementById('btn-add-param');
  const btnCreate = document.getElementById('btn-create');
  const btnClear = document.getElementById('btn-clear');
  const toastMessage = document.getElementById('toast-message');
  const form = document.getElementById('char-form');

  const colorPicker = document.getElementById('color');
  const colorHexInput = document.getElementById('color-hex-input');

  // Sync color picker and hex input
  colorPicker.addEventListener('input', (e) => {
    colorHexInput.value = e.target.value.toUpperCase();
  });

  colorHexInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.length === 7 && val.startsWith('#')) {
      colorPicker.value = val;
    }
  });

  colorHexInput.addEventListener('blur', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) {
      val = '#' + val;
    }
    // Very basic hex validation fallback
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      colorHexInput.value = val.toUpperCase();
      colorPicker.value = val;
    } else {
      // Revert to picker color if invalid
      colorHexInput.value = colorPicker.value.toUpperCase();
    }
  });


  const getRemoveIcon = () => `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  // Add Status Row
  btnAddStatus.addEventListener('click', () => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <input type="text" class="status-label" placeholder="ステータス">
      <input type="number" class="status-value" placeholder="現在値" value="">
      <input type="number" class="status-max" placeholder="最大値" value="">
      <button type="button" class="btn-icon" title="削除">
        ${getRemoveIcon()}
      </button>
    `;
    item.querySelector('.btn-icon').addEventListener('click', () => item.remove());
    statusList.appendChild(item);
  });

  // Add Param Row
  btnAddParam.addEventListener('click', () => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <input type="text" class="param-label" placeholder="ラベル">
      <input type="text" class="param-value" placeholder="">
      <button type="button" class="btn-icon" title="削除">
        ${getRemoveIcon()}
      </button>
    `;
    item.querySelector('.btn-icon').addEventListener('click', () => item.remove());
    paramsList.appendChild(item);
  });

  // Clear Form
  btnClear.addEventListener('click', () => {
    if (confirm('入力内容をすべてクリアしますか？')) {
      form.reset();
      
      // Clear lists
      statusList.innerHTML = '';
      paramsList.innerHTML = '';
      
      // Reset color
      colorHexInput.value = '#888888';
      colorPicker.value = '#888888';
      
      // Add default items
      btnAddStatus.click();
      btnAddParam.click();
    }
  });

  // Generate JSON and Copy to Clipboard
  btnCreate.addEventListener('click', async () => {
    const data = {
      name: document.getElementById('name').value,
      memo: document.getElementById('memo').value,
      initiative: Number(document.getElementById('initiative').value),
      externalUrl: document.getElementById('externalUrl').value,
      secret: document.getElementById('secret').checked,
      invisible: document.getElementById('invisible').checked,
      hideStatus: document.getElementById('hideStatus').checked,
      color: document.getElementById('color-hex-input').value, // Use hex input value directly
      commands: document.getElementById('commands').value,
      status: [],
      params: []
    };

    // Collect Status
    document.querySelectorAll('#status-list .list-item').forEach(item => {
      const label = item.querySelector('.status-label').value.trim();
      const value = Number(item.querySelector('.status-value').value);
      const max = Number(item.querySelector('.status-max').value);
      if (label) {
        data.status.push({ label, value, max });
      }
    });

    // Collect Params
    document.querySelectorAll('#params-list .list-item').forEach(item => {
      const label = item.querySelector('.param-label').value.trim();
      const value = item.querySelector('.param-value').value.trim();
      if (label) {
        data.params.push({ label, value });
      }
    });

    const payload = {
      kind: "character",
      data: data
    };

    try {
      const jsonString = JSON.stringify(payload);
      await navigator.clipboard.writeText(jsonString);

      // Show success toast
      toastMessage.classList.add('show');
      setTimeout(() => {
        toastMessage.classList.remove('show');
      }, 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback
      try {
        const tempInput = document.createElement('textarea');
        tempInput.value = JSON.stringify(payload);
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);

        toastMessage.classList.add('show');
        setTimeout(() => {
          toastMessage.classList.remove('show');
        }, 3000);
      } catch (fallbackErr) {
        alert('クリップボードへのコピーに失敗しました。');
      }
    }
  });

  // Add default items
  btnAddStatus.click();
  btnAddParam.click();
});
