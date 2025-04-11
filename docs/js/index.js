const LATEST_VERSION = '2.5.0';

async function main() {
    const buttons = document.querySelectorAll('#tabs button');
    const pages = document.querySelectorAll('.page-wrapper');
    const border = document.querySelector('#border');

    buttons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const target = e.target;
            const page = target.dataset.page;
            window.location.hash = page;
        })
    });

    function showTab() {
        let hash = window.location.hash.substring(1);
    
        if (!hash) {
            hash = 'home'; 
            history.replaceState(null, null, `#${hash}`);
        }

        const currentPage = document.getElementById(hash);

        if(!currentPage) {
            window.location.hash = 'home';
            return;
        }

        buttons.forEach(btn => {
            btn.style.backgroundColor = '';
            btn.style.color = 'white';
        });

        pages.forEach(_page => {
            _page.classList.remove('visible');
        });

        
        const pageColor = currentPage.dataset.color;

        currentPage.classList.add('visible');

        const pageButton = document.querySelector(`#tabs button[data-page="${hash}"]`);

        pageButton.style.backgroundColor = pageColor;

        if(pageColor === "white") {
            pageButton.style.color = 'black';
        }

        border.style.backgroundColor = getComputedStyle(pageButton).borderColor;
    }

    window.addEventListener('hashchange', showTab);
    showTab();

    const versionElement = document.querySelector('#version_num');

    if(versionElement) {
        versionElement.innerHTML = `v${LATEST_VERSION}`;
    }
}